import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { auth } from "@/shared/better-auth/auth";
import { headers } from "next/headers";
import { render, pretty } from "@react-email/render";
import { EmailTemplate } from "@/shared/email/email-template";

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

    const html = await pretty(
      await render(
        EmailTemplate({
          name: ticket.name,
          qrCodeUrl: ticket.qr_code,
          ticketType: ticket.grade,
        })
      )
    );

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (e) {
    console.error("GET /ticket/:id failed:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
