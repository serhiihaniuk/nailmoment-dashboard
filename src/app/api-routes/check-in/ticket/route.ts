import { NextResponse } from "next/server";

import { authorizeDashboardRequest } from "@/shared/better-auth/authorization";
import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { buildTicketFinanceSummary } from "@/entities/ticket";

const ticketService = createTicketService(db, {
  buildFinanceSummary: buildTicketFinanceSummary,
});

export async function GET() {
  const authorization = await authorizeDashboardRequest({ ticket: ["read"] });
  if (!authorization.ok) return authorization.response;

  const tickets = await ticketService.getCheckInTickets();
  return NextResponse.json(tickets, { status: 200 });
}

export const dynamic = "force-dynamic";
