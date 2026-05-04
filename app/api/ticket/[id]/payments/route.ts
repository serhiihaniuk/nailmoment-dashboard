import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createFinanceService } from "@/shared/db/service/finance-service";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { insertPaymentInstallmentApiInputSchema } from "@/shared/db/schema.zod";

const financeService = createFinanceService(db);
const ticketService = createTicketService(db);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await ticketService.getTicket(id);
  if (!ticket) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const payments = await financeService.getPaymentsForTicket(id);
  return NextResponse.json(payments, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await ticketService.getTicket(id);
  if (!ticket) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  let data: z.input<typeof insertPaymentInstallmentApiInputSchema>;
  try {
    data = insertPaymentInstallmentApiInputSchema.parse(
      (await req.json()) ?? {}
    );
  } catch (e) {
    return NextResponse.json(
      { message: "Validation failed", issues: (e as z.ZodError).issues },
      { status: 400 }
    );
  }

  const payment = await financeService.addPaymentForTicket(id, data);
  return NextResponse.json(payment, { status: 201 });
}

export const dynamic = "force-dynamic";
