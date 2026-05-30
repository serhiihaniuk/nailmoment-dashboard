import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizeDashboardRequest } from "@/shared/better-auth/authorization";
import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { parseRouteParams } from "@/app/api-routes/lib/request";
import { buildTicketFinanceSummary, ticketIdSchema } from "@/entities/ticket";

const ticketService = createTicketService(db, {
  buildFinanceSummary: buildTicketFinanceSummary,
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeDashboardRequest({ ticket: ["read"] });
  if (!authorization.ok) return authorization.response;

  const parsedParams = await parseRouteParams(
    params,
    z.object({ id: ticketIdSchema })
  );
  if (!parsedParams.ok) return parsedParams.response;

  const ticket = await ticketService.getCheckInTicket(parsedParams.data.id);
  return ticket
    ? NextResponse.json(ticket, { status: 200 })
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export const dynamic = "force-dynamic";
