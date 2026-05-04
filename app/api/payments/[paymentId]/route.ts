import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createFinanceService } from "@/shared/db/service/finance-service";
import { patchPaymentInstallmentSchema } from "@/shared/db/schema.zod";
import { paymentInstallmentTable, ticketTable } from "@/shared/db/schema";

const financeService = createFinanceService(db);
const STRIPE_EDITABLE_PAYMENT_FIELDS = new Set([
  "invoice_status",
  "invoice_number",
]);

async function getPaymentGuard(paymentId: string) {
  const rows = await db
    .select({
      paid_date: paymentInstallmentTable.paid_date,
      installment_number: paymentInstallmentTable.installment_number,
      stripe_event_id: ticketTable.stripe_event_id,
    })
    .from(paymentInstallmentTable)
    .innerJoin(ticketTable, eq(paymentInstallmentTable.ticket_id, ticketTable.id))
    .where(eq(paymentInstallmentTable.id, paymentId))
    .limit(1);

  return rows[0] ?? null;
}

function isStripeOriginPayment(
  payment: NonNullable<Awaited<ReturnType<typeof getPaymentGuard>>>
) {
  return (
    !payment.stripe_event_id.startsWith("manual") &&
    payment.installment_number === 1
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { paymentId } = await params;
  let data: z.input<typeof patchPaymentInstallmentSchema>;
  let requestedPaymentFields: string[] = [];

  try {
    const rawData = (await req.json()) ?? {};
    requestedPaymentFields =
      rawData && typeof rawData === "object" && !Array.isArray(rawData)
        ? Object.keys(rawData)
        : [];
    data = patchPaymentInstallmentSchema.parse(rawData);
  } catch (e) {
    return NextResponse.json(
      { message: "Validation failed", issues: (e as z.ZodError).issues },
      { status: 400 }
    );
  }

  const paymentGuard = await getPaymentGuard(paymentId);
  if (!paymentGuard) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (
    isStripeOriginPayment(paymentGuard) &&
    requestedPaymentFields.some(
      (field) => !STRIPE_EDITABLE_PAYMENT_FIELDS.has(field)
    )
  ) {
    return NextResponse.json(
      { message: "Only invoice fields can be modified for Stripe payments." },
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { paymentId } = await params;
  const paymentGuard = await getPaymentGuard(paymentId);
  if (!paymentGuard) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (isStripeOriginPayment(paymentGuard)) {
    return NextResponse.json(
      { message: "Stripe payments cannot be deleted." },
      { status: 403 }
    );
  }
  if (paymentGuard.paid_date) {
    return NextResponse.json(
      { message: "Paid payments cannot be deleted." },
      { status: 403 }
    );
  }

  const deleted = await financeService.deletePayment(paymentId);

  return deleted
    ? NextResponse.json(deleted, { status: 200 })
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export const dynamic = "force-dynamic";
