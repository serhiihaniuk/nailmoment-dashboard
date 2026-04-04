"use server";

import { db } from "@/shared/db";
import { createTicketService } from "@/shared/db/service/ticket-service";
import { auth } from "@/shared/better-auth/auth";
import { render, pretty } from "@react-email/render";
import { EmailTemplate } from "@/shared/email/email-template";
import { CustomEmailTemplate } from "@/shared/email/custom-email-template";
import { headers } from "next/headers";
import { Resend } from "resend";

const ticketService = createTicketService(db);

export async function getTicketHtml(id: string): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("401");

  const ticket = await ticketService.getTicket(id);
  if (!ticket) return null;

  return pretty(
    await render(
      EmailTemplate({
        name: ticket.name,
        qrCodeUrl: ticket.qr_code,
        ticketType: ticket.updated_grade || ticket.grade,
        ticketId: ticket.id,
      })
    )
  );
}

export async function getTicketText(id: string): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("401");

  const ticket = await ticketService.getTicket(id);
  if (!ticket) return null;

  const ticketType = (ticket.updated_grade || ticket.grade).toUpperCase();
  const shortCode = ticket.id.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toLowerCase();
  return [
    `Вітаємо, ${ticket.name}!`,
    ``,
    `Дякуємо за покупку квитка ${ticketType} на фестиваль Nail Moment у Варшаві.`,
    ``,
    `Код вашого квитка: #${shortCode}`,
    ``,
    `Деталі події:`,
    `Дата: 7 червня 2026`,
    `Місце: Uczelnia Biznesu i Nauk Stosowanych "Varsovia"`,
    `Адреса: Al. Jerozolimskie 133A, 02-304 Warszawa`,
    ``,
    `Telegram-канал: https://t.me/+5bQ5eI6x0vIyZTlk`,
    ``,
    `З нетерпінням чекаємо на зустріч!`,
    `Команда Nail Moment`,
    ``,
    `nailmoment.pl | Nailmoment.Official@gmail.com`,
  ].join("\n");
}

export async function previewCustomEmail(
  ticketId: string,
  subject: string,
  body: string
): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("401");

  const ticket = await ticketService.getTicket(ticketId);
  const name = ticket?.name ?? "{{name}}";

  return await pretty(
    await render(CustomEmailTemplate({ name, subject, body }))
  );
}

export async function sendCustomEmail(
  ticketId: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("401");

  const ticket = await ticketService.getTicket(ticketId);
  if (!ticket) return { success: false, error: "Ticket not found" };

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = await render(
    CustomEmailTemplate({ name: ticket.name, subject, body })
  );

  const plainText = `${ticket.name},\n\n${body}\n\nЗ повагою,\nКоманда Nail Moment\nnailmoment.pl | Nailmoment.Official@gmail.com`;

  const { error } = await resend.emails.send({
    from: "nailmoment-ticket@nailmoment.pl",
    to: ticket.email,
    subject,
    html,
    text: plainText,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
