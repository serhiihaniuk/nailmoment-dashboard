import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { NextResponse } from "next/server";
import { auth } from "@/shared/better-auth/auth";
import { headers } from "next/headers";

const ticketService = createTicketService(db);

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized: No session found." },
        { status: 401 } // Unauthorized
      );
    }

    const tickets = await ticketService.getTickets();

    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error("API Error fetching tickets:", error);

    return NextResponse.json(
      { message: "Internal Server Error: Could not fetch tickets." },
      { status: 500 } // Internal Server Error
    );
  }
}

export const dynamic = "force-dynamic";
