import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import {
  paymentInstallmentTable,
  ticketFinanceTable,
} from "@/shared/db/schema";
import { createTicketService } from "@/shared/db/service/ticket-service";
import {
  insertPaymentInstallmentApiInputSchema,
  patchPaymentInstallmentSchema,
  upsertTicketFinanceSchema,
  type InsertPaymentInstallmentInput,
  type PatchPaymentInstallmentInput,
  type UpsertTicketFinanceInput,
} from "@/shared/db/schema.zod";
import {
  getExpectedPaymentCount,
  splitMoney,
  ticketIdSchema,
  paymentPlanSchema,
  toMoneyNumber,
} from "@/entities/ticket";
import {
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";

const ticketService = createTicketService(db);
const paymentPlanRequestSchema = z.object({
  payment_plan: paymentPlanSchema,
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = await parseRouteParams(
    params,
    z.object({ id: ticketIdSchema })
  );
  if (!parsedParams.ok) return parsedParams.response;

  const parsedBody = await parseRequestJson(req, paymentPlanRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { id } = parsedParams.data;
  const paymentPlan = parsedBody.data.payment_plan;
  const ticket = await ticketService.getTicket(id);

  if (!ticket) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const expectedPaymentCount = getExpectedPaymentCount(paymentPlan);
  const sortedPayments = [...ticket.payments].sort(
    (a, b) => a.installment_number - b.installment_number
  );
  const paidPayments = sortedPayments.filter((payment) => payment.paid_date);

  if (
    expectedPaymentCount !== null &&
    expectedPaymentCount < paidPayments.length
  ) {
    return NextResponse.json(
      {
        message:
          "Не можна вибрати менше платежів, ніж уже оплачено.",
      },
      { status: 400 }
    );
  }

  if (expectedPaymentCount === null) {
    await upsertFinance(id, ticket.finance?.id ?? null, {
      payment_plan: paymentPlan,
    });
  } else if (expectedPaymentCount === 0) {
    await upsertFinance(id, ticket.finance?.id ?? null, {
      payment_plan: paymentPlan,
      gross_total: "0.00",
      discount_amount: "0.00",
      tax_amount: "0.00",
      net_total: "0.00",
    });

    for (const payment of sortedPayments.filter(
      (payment) => !payment.paid_date
    )) {
      await db
        .delete(paymentInstallmentTable)
        .where(eq(paymentInstallmentTable.id, payment.id));
    }
  } else {
    await upsertFinance(id, ticket.finance?.id ?? null, {
      payment_plan: paymentPlan,
    });

    const remainingAfterPaid = Math.max(
      toMoneyNumber(ticket.finance?.gross_total) -
        paidPayments.reduce(
          (total, payment) => total + toMoneyNumber(payment.amount),
          0
        ),
      0
    );
    const targetPaymentCount = Math.max(
      expectedPaymentCount,
      paidPayments.length + (remainingAfterPaid >= 0.01 ? 1 : 0)
    );
    const paidPaymentIds = new Set(paidPayments.map((payment) => payment.id));
    const removeCount = Math.max(sortedPayments.length - targetPaymentCount, 0);
    const removablePayments = sortedPayments
      .filter((payment) => !paidPaymentIds.has(payment.id))
      .sort((a, b) => b.installment_number - a.installment_number)
      .slice(0, removeCount);
    const removablePaymentIds = new Set(
      removablePayments.map((payment) => payment.id)
    );

    for (const payment of removablePayments) {
      await db
        .delete(paymentInstallmentTable)
        .where(eq(paymentInstallmentTable.id, payment.id));
    }

    const splitAmounts = splitMoney(
      remainingAfterPaid.toFixed(2),
      Math.max(targetPaymentCount - paidPayments.length, 0)
    );
    const remainingPayments = sortedPayments
      .filter((payment) => !removablePaymentIds.has(payment.id))
      .sort((a, b) => a.installment_number - b.installment_number);
    let unpaidPaymentIndex = 0;

    for (const [index, payment] of remainingPayments.entries()) {
      const patch: PatchPaymentInstallmentInput = {};

      if (payment.installment_number !== index + 1) {
        patch.installment_number = index + 1;
      }

      if (!payment.paid_date) {
        patch.amount = splitAmounts[unpaidPaymentIndex] ?? "0.00";
        unpaidPaymentIndex += 1;
      }

      const validatedPatch = patchPaymentInstallmentSchema.parse(patch);
      if (Object.keys(validatedPatch).length > 0) {
        await db
          .update(paymentInstallmentTable)
          .set(validatedPatch)
          .where(eq(paymentInstallmentTable.id, payment.id));
      }
    }

    for (
      let index = remainingPayments.length + 1;
      index <= targetPaymentCount;
      index += 1
    ) {
      const paymentData: InsertPaymentInstallmentInput = {
        installment_number: index,
        amount: splitAmounts[unpaidPaymentIndex] ?? "0.00",
        sale_source: "direct_transfer",
        paid_date: "",
        due_date: "",
        payment_method: "other",
        invoice_status: "not_needed",
        invoice_number: "",
        comment: "",
      };
      const validatedPayment =
        insertPaymentInstallmentApiInputSchema.parse(paymentData);

      await db.insert(paymentInstallmentTable).values({
        id: nanoid(10),
        ticket_id: id,
        ...validatedPayment,
      });
      unpaidPaymentIndex += 1;
    }
  }

  const updatedTicket = await ticketService.getTicket(id);
  return updatedTicket
    ? NextResponse.json(updatedTicket, { status: 200 })
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

async function upsertFinance(
  ticketId: string,
  existingFinanceId: string | null,
  financeData: UpsertTicketFinanceInput
) {
  const validatedData = upsertTicketFinanceSchema.parse(financeData);

  if (existingFinanceId) {
    await db
      .update(ticketFinanceTable)
      .set(validatedData)
      .where(eq(ticketFinanceTable.id, existingFinanceId));
    return;
  }

  await db.insert(ticketFinanceTable).values({
    id: nanoid(10),
    ticket_id: ticketId,
    ...validatedData,
  });
}

export const dynamic = "force-dynamic";
