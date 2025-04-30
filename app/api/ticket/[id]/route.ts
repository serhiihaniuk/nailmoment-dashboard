import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { auth } from "@/shared/better-auth/auth";
import { headers } from "next/headers";

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

    const { id } = await params;

    const ticket = await ticketService.getTicket(id);
    if (!ticket)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(ticket, { status: 200 });
  } catch (e) {
    console.error("GET /ticket/:id failed:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = (await req.json()) ?? {};
    const updated = await ticketService.updateTicket(id, body);

    if (!updated)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    console.error("PATCH /ticket/:id failed:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
