import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createFinanceService } from "@/shared/db/service/finance-service";
import { patchPaymentInstallmentSchema } from "@/shared/db/schema.zod";
import { paymentInstallmentTable, ticketTable } from "@/shared/db/schema";
import {
  objectKeys,
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";
import {
  getPaymentDeleteDenialReason,
  getPaymentPatchDenialReason,
  paymentInstallmentIdSchema,
  type PaymentEditPolicyContext,
} from "@/entities/ticket";

const financeService = createFinanceService(db);

async function getPaymentGuard(paymentId: string) {
  const rows = await db
    .select({
      is_paid: paymentInstallmentTable.is_paid,
      installment_number: paymentInstallmentTable.installment_number,
      stripe_event_id: ticketTable.stripe_event_id,
    })
    .from(paymentInstallmentTable)
    .innerJoin(ticketTable, eq(paymentInstallmentTable.ticket_id, ticketTable.id))
    .where(eq(paymentInstallmentTable.id, paymentId))
    .limit(1);

  return rows[0] ?? null;
}

function getPaymentEditPolicyContext(
  payment: NonNullable<Awaited<ReturnType<typeof getPaymentGuard>>>
): PaymentEditPolicyContext {
  return {
    ticket: {
      stripe_event_id: payment.stripe_event_id,
    },
    payment: {
      installment_number: payment.installment_number,
      is_paid: payment.is_paid,
    },
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = await parseRouteParams(
    params,
    z.object({ paymentId: paymentInstallmentIdSchema })
  );
  if (!parsedParams.ok) return parsedParams.response;

  const parsedBody = await parseRequestJson(req, patchPaymentInstallmentSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { paymentId } = parsedParams.data;
  const data = parsedBody.data;
  const requestedPaymentFields = objectKeys(parsedBody.raw);

  const paymentGuard = await getPaymentGuard(paymentId);
  if (!paymentGuard) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const denialReason = getPaymentPatchDenialReason(
    getPaymentEditPolicyContext(paymentGuard),
    requestedPaymentFields
  );
  if (denialReason) {
    return NextResponse.json(
      { message: denialReason.message, reason: denialReason.code },
      { status: 403 }
    );
  }

  const payment = await financeService.updatePayment(paymentId, data);
  return payment
    ? NextResponse.json(payment, { status: 200 })
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = await parseRouteParams(
    params,
    z.object({ paymentId: paymentInstallmentIdSchema })
  );
  if (!parsedParams.ok) return parsedParams.response;

  const { paymentId } = parsedParams.data;
  const paymentGuard = await getPaymentGuard(paymentId);
  if (!paymentGuard) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const denialReason = getPaymentDeleteDenialReason(
    getPaymentEditPolicyContext(paymentGuard)
  );
  if (denialReason) {
    return NextResponse.json(
      { message: denialReason.message, reason: denialReason.code },
      { status: 403 }
    );
  }

  const deleted = await financeService.deletePayment(paymentId);

  return deleted
    ? NextResponse.json(deleted, { status: 200 })
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export const dynamic = "force-dynamic";
