import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createFinanceService } from "@/shared/db/service/finance-service";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { upsertTicketFinanceSchema } from "@/shared/db/schema.zod";
import {
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";
import { buildTicketFinanceSummary, ticketIdSchema } from "@/entities/ticket";

const financeService = createFinanceService(db);
const ticketService = createTicketService(db, {
  buildFinanceSummary: buildTicketFinanceSummary,
});

export async function GET(
  _req: NextRequest,
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

  const { id } = parsedParams.data;
  const ticket = await ticketService.getTicket(id);
  if (!ticket) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const finance = await financeService.getFinanceForTicket(id);
  return NextResponse.json(finance, { status: 200 });
}

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

  const { id } = parsedParams.data;
  const ticket = await ticketService.getTicket(id);
  if (!ticket) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const parsedBody = await parseRequestJson(req, upsertTicketFinanceSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const finance = await financeService.upsertFinanceForTicket(
    id,
    parsedBody.data
  );
  return NextResponse.json(finance, { status: 200 });
}

export const dynamic = "force-dynamic";
