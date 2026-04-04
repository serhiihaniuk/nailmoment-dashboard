import QRCode from "qrcode";
import { Resend } from "resend";
import { put } from "@vercel/blob";
import { EmailTemplate } from "./email-template";
import { BattleTicketEmailTemplate } from "./battle-email-template";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function generateAndStoreQRCode(
  url: string,
  filename: string
): Promise<string> {
  try {
    const qrBuffer = await QRCode.toBuffer(url);
    const blob = await put(filename, qrBuffer, {
      access: "public",
      contentType: "image/png",
    });
    return blob.url;
  } catch (error) {
    console.error("Error generating or storing QR code:", error);
    throw new Error("Failed to generate or store QR code");
  }
}

export async function sendTicketEmail(
  to: string,
  name: string,
  qrCodeUrl: string,
  ticketType: string,
  ticketId?: string
) {
  try {
    const shortCode = ticketId
      ? ticketId.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toLowerCase()
      : "";

    const plainText = [
      `Вітаємо, ${name}!`,
      ``,
      `Дякуємо за покупку квитка ${ticketType.toUpperCase()} на фестиваль Nail Moment у Варшаві.`,
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

    const { data, error } = await resend.emails.send({
      from: "nailmoment-ticket@nailmoment.pl",
      to,
      subject: "Ваш квиток на фестиваль Nail Moment у Варшаві",
      text: plainText,
      react: EmailTemplate({ name, qrCodeUrl, ticketType, ticketId }),
    });

    if (error) {
      throw error;
    }

    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

export async function sendBattleEmail(
  to: string,
  name: string,
  ticketId: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: "nailmoment-battle@nailmoment.pl",
      to,
      subject: "Ваш квиток учасника Битви Майстрів — Nail Moment",
      html: "",
      react: BattleTicketEmailTemplate({ name, ticketId }),
    });

    if (error) {
      throw error;
    }

    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}
