import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { parseRequestJson, parseRouteParams } from "@/app/api-routes/lib/request";
import { authorizeDashboardRequest } from "@/shared/better-auth/authorization";
import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { buildTicketFinanceSummary, ticketIdSchema } from "@/entities/ticket";

const ticketService = createTicketService(db, {
  buildFinanceSummary: buildTicketFinanceSummary,
});

const arrivalPatchSchema = z.object({
  arrived: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeDashboardRequest({
    ticket: ["check-in"],
  });
  if (!authorization.ok) return authorization.response;

  const parsedParams = await parseRouteParams(
    params,
    z.object({ id: ticketIdSchema })
  );
  if (!parsedParams.ok) return parsedParams.response;

  const parsedBody = await parseRequestJson(req, arrivalPatchSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const ticket = await ticketService.setTicketArrival(
    parsedParams.data.id,
    parsedBody.data.arrived
  );

  return ticket
    ? NextResponse.json(ticket, { status: 200 })
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export const dynamic = "force-dynamic";
