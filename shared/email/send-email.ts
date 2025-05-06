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
  ticketType: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: "nailmoment-ticket@nailmoment.pl",
      to,
      subject: "Ваш квиток на конференцію Nail Moment",
      html: "",
      react: EmailTemplate({ name, qrCodeUrl, ticketType }),
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
      subject: "Ваш битва на конференцію Nail Moment",
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
