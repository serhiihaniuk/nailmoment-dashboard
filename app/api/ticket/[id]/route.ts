import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { auth } from "@/shared/better-auth/auth";
import { headers } from "next/headers";
import { updateTicketSchema } from "@/shared/db/schema.zod";
import { z } from "zod";

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

type Patch = z.infer<typeof updateTicketSchema>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = (await req.json()) ?? {};
  let patch: Patch;
  try {
    patch = updateTicketSchema.parse(body);
  } catch (e) {
    return NextResponse.json(
      { message: "Validation failed", issues: (e as z.ZodError).issues },
      { status: 400 }
    );
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  const updated = await ticketService.updateTicket(id, patch);

  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export const dynamic = "force-dynamic";
