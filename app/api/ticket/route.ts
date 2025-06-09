import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { ticketTable } from "@/shared/db/schema";
import { createTicketService } from "@/shared/db/service/ticket-service";
import {
  insertTicketSchema, // DB shape (id, stripe_event_id …)
  insertTicketClientSchema, // allowed client fields
} from "@/shared/db/schema.zod";
import { extractInstagramUsername } from "@/shared/utils";
import {
  generateAndStoreQRCode,
  sendTicketEmail,
} from "@/shared/email/send-email";

const ticketService = createTicketService(db);

const parseBody = async (req: NextRequest) => {
  const parsed = insertTicketClientSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw new NextResponse(
      JSON.stringify({
        message: "Validation failed",
        error: parsed.error.issues,
      }),
      { status: 400 }
    );
  }
  return parsed.data;
};

const toDbPayload = async (body: z.infer<typeof insertTicketClientSchema>) => {
  const id = nanoid(10);
  const stripe_event_id = `manual_${id}`;
  const instagram = body.instagram
    ? extractInstagramUsername(body.instagram)
    : "";

  const qr_code = await generateAndStoreQRCode(
    `https://dashboard.nailmoment.pl/ticket/${id}`,
    `moment-qr/festival/qr-code-${id}.png`
  );

  return insertTicketSchema.parse({
    id,
    stripe_event_id,
    name: body.name,
    email: body.email,
    phone: body.phone,
    instagram,
    qr_code,
    grade: (body.grade ?? "guest").toLowerCase(),
    mail_sent: false,
  });
};

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized: No session found." },
        { status: 401 }
      );
    }
    const tickets = await ticketService.getTickets({ archived: true });
    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error("API Error fetching tickets:", error);
    return NextResponse.json(
      { message: "Internal Server Error: Could not fetch tickets." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await parseBody(req);
    const dbPayload = await toDbPayload(body);

    const ticket = await ticketService.addTicket(dbPayload);

    let mailSent = false;
    let mailError: string | null = null;

    try {
      await sendTicketEmail(
        ticket.email,
        ticket.name,
        ticket.qr_code,
        ticket.grade
      );
      await db
        .update(ticketTable)
        .set({ mail_sent: true })
        .where(eq(ticketTable.id, ticket.id));
      mailSent = true;
    } catch (err) {
      mailError =
        err instanceof Error ? err.message : "Unknown error while sending mail";
    }

    return NextResponse.json({ ticket, mailSent, mailError }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;

    console.error("API Error adding ticket:", err);
    return NextResponse.json(
      { message: "Internal Server Error: Could not add ticket." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
