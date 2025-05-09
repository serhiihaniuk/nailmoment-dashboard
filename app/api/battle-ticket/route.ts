// app/api/battle-ticket/route.ts

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { battleTicketTable } from "@/shared/db/schema";
import {
  insertBattleTicketSchema,
  InsertBattleTicketInput,
  insertBattleTicketClientSchema,
  InsertBattleTicketClientInput,
} from "@/shared/db/schema.zod";
import { createBattleTicketService } from "@/shared/db/service/battle-ticket-service";
import { extractInstagramUsername } from "@/shared/utils";
import { sendBattleEmail } from "@/shared/email/send-email";

const battleTicketService = createBattleTicketService(db);

const parseClientBody = async (
  req: NextRequest
): Promise<InsertBattleTicketClientInput> => {
  let bodyJson;
  try {
    bodyJson = await req.json();
  } catch (error) {
    console.error("API Error parsing battle ticket body:", error);
    throw new NextResponse(JSON.stringify({ message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsed = insertBattleTicketClientSchema.safeParse(bodyJson);
  if (!parsed.success) {
    throw new NextResponse(
      JSON.stringify({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  return parsed.data;
};

const toDbBattleTicketPayload = (
  clientData: InsertBattleTicketClientInput
): InsertBattleTicketInput => {
  const id = nanoid(10);
  const stripe_event_id = `manual_battle_${id}`;
  const instagram = extractInstagramUsername(clientData.instagram);

  const dbPayload: InsertBattleTicketInput = {
    id,
    stripe_event_id,
    name: clientData.name,
    email: clientData.email,
    phone: clientData.phone,
    instagram,
    nomination_quantity: clientData.nomination_quantity,
    mail_sent: false,
    archived: false,
    date: new Date(),
    comment: clientData.comment || "",
  };

  return insertBattleTicketSchema.parse(dbPayload);
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

    const tickets = await battleTicketService.getBattleTickets({
      archived: false,
    });
    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error("API Error fetching battle tickets:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch battle tickets.";
    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const clientData = await parseClientBody(req);
    const dbPayload = toDbBattleTicketPayload(clientData);

    const newBattleTicket =
      await battleTicketService.addBattleTicket(dbPayload);

    let mailSent = false;
    let mailError: string | null = null;

    try {
      await sendBattleEmail(
        newBattleTicket.email,
        newBattleTicket.name,
        newBattleTicket.id
      );

      await db
        .update(battleTicketTable)
        .set({ mail_sent: true })
        .where(eq(battleTicketTable.id, newBattleTicket.id));
      mailSent = true;
      newBattleTicket.mail_sent = true;
    } catch (err) {
      mailError =
        err instanceof Error
          ? err.message
          : "Unknown error while sending battle ticket email";
      console.error(
        `Failed to send battle ticket email to ${newBattleTicket.email}:`,
        mailError
      );
    }

    return NextResponse.json(
      { battleTicket: newBattleTicket, mailSent, mailError },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) {
      return err;
    }

    console.error("API Error adding battle ticket:", err);
    const message =
      err instanceof Error ? err.message : "Could not add battle ticket.";
    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
