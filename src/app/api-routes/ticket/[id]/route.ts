import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { auth } from "@/shared/better-auth/auth";
import { headers } from "next/headers";
import { updateTicketSchema } from "@/shared/db/schema.zod";
import { z } from "zod";
import { sendTicketEmail } from "@/shared/email/send-email";
import { ticketTable } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import {
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";
import { ticketIdSchema } from "@/entities/ticket";

const ticketService = createTicketService(db);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    if (!ticket)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(ticket, { status: 200 });
  } catch (e) {
    console.error("GET /ticket/:id failed:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

type Patch = z.infer<typeof updateTicketSchema>;

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

  const parsedBody = await parseRequestJson(req, updateTicketSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { id } = parsedParams.data;
  const patch: Patch = parsedBody.data;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  const updated = await ticketService.updateTicket(id, patch);

  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function POST(
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

  try {
    await sendTicketEmail(
      ticket.email,
      ticket.name,
      ticket.qr_code,
      ticket.updated_grade || ticket.grade,
      ticket.id
    );
    await db
      .update(ticketTable)
      .set({ mail_sent: true })
      .where(eq(ticketTable.id, ticket.id));

    return NextResponse.json({ message: "Email sent" });
  } catch (e) {
    console.error("POST /ticket/:id resend failed:", e);
    return NextResponse.json(
      { message: "Failed to send email" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
