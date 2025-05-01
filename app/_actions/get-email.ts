"use server";

import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { render, pretty } from "@react-email/render";
import { EmailTemplate } from "@/shared/email/email-template";

const ticketService = createTicketService(db);

export async function getTicketHtml(id: string): Promise<string | null> {
  const ticket = await ticketService.getTicket(id);
  if (!ticket) return null;

  return pretty(
    await render(
      EmailTemplate({
        name: ticket.name,
        qrCodeUrl: ticket.qr_code,
        ticketType: ticket.updated_grade || ticket.grade,
      }),
    ),
  );
}
