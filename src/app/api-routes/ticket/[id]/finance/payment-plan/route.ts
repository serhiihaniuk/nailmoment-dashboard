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
  type UpsertTicketFinanceInput,
} from "@/shared/db/schema.zod";
import {
  buildTicketFinanceSummary,
  buildPaymentPlanSync,
  ticketIdSchema,
  paymentPlanSchema,
} from "@/entities/ticket";
import {
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";

const ticketService = createTicketService(db, {
  buildFinanceSummary: buildTicketFinanceSummary,
});
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

  const syncResult = buildPaymentPlanSync({
    finance: ticket.finance,
    paymentPlan,
    payments: ticket.payments,
  });

  if (!syncResult.ok) {
    return NextResponse.json(
      {
        message:
          "Не можна вибрати менше платежів, ніж уже оплачено.",
      },
      { status: 400 }
    );
  }

  const { sync } = syncResult;
  await upsertFinance(id, ticket.finance?.id ?? null, sync.financePatch);

  for (const paymentId of sync.deletePaymentIds) {
    await db
      .delete(paymentInstallmentTable)
      .where(eq(paymentInstallmentTable.id, paymentId));
  }

  for (const paymentPatch of sync.paymentPatches) {
    const validatedPatch = patchPaymentInstallmentSchema.parse(
      paymentPatch.patch
    );
    if (Object.keys(validatedPatch).length > 0) {
      await db
        .update(paymentInstallmentTable)
        .set(validatedPatch)
        .where(eq(paymentInstallmentTable.id, paymentPatch.paymentId));
    }
  }

  for (const paymentData of sync.createPayments) {
    const validatedPayment =
      insertPaymentInstallmentApiInputSchema.parse(paymentData);

    await db.insert(paymentInstallmentTable).values({
      id: nanoid(10),
      ticket_id: id,
      ...validatedPayment,
    });
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
