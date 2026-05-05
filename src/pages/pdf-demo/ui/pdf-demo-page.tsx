import { render, pretty } from "@react-email/render";
import { EmailTemplate } from "@/shared/email/email-template";
import { BattleTicketEmailTemplate } from "@/shared/email/battle-email-template";
import { auth } from "@/shared/better-auth/auth";
import { headers } from "next/headers";
import { EmailDemoPage } from "./email-demo-page";

export const dynamic = "force-dynamic";

const PLACEHOLDER_QR =
  "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DEMO-TICKET-12345";

const DEMO_TICKET_ID = "tkt_Ab3Cd5Ef7Gh";

async function renderEmails() {
  const ticketTypes = ["standard", "maxi", "vip"] as const;

  const tickets = await Promise.all(
    ticketTypes.map(async (type) => {
      const html = await pretty(
        await render(
          EmailTemplate({
            name: "Олена Коваленко",
            qrCodeUrl: PLACEHOLDER_QR,
            ticketType: type,
            ticketId: DEMO_TICKET_ID,
          })
        )
      );
      const shortCode = DEMO_TICKET_ID.replace(/[^a-zA-Z0-9]/g, "")
        .slice(-5)
        .toLowerCase();
      const text = [
        `Вітаємо, Олена Коваленко!`,
        ``,
        `Дякуємо за покупку квитка ${type.toUpperCase()} на фестиваль Nail Moment у Варшаві.`,
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
      return { type, html, text };
    })
  );

  const battleHtml = await pretty(
    await render(
      BattleTicketEmailTemplate({
        name: "Олена Коваленко",
        ticketId: "BTL-00042",
      })
    )
  );
  const battleText = [
    `Вітаємо, Олена Коваленко!`,
    ``,
    `Дякуємо за покупку квитка учасника конкурсу "Битва Майстрів"!`,
    ``,
    `Ваш номер квитка: BTL-00042`,
    ``,
    `Що робити далі:`,
    `1. Виберіть категорію, на яку будете надсилати роботу.`,
    `2. Підготуйте якісну роботу та зробіть 1-3 фотографії.`,
    `3. Надішліть номінацію + фото у Telegram: @nail_moment_pl`,
    ``,
    `З нетерпінням чекаємо на ваші роботи!`,
    `Команда Nail Moment`,
    ``,
    `nailmoment.pl | Nailmoment.Official@gmail.com`,
  ].join("\n");

  return { tickets, battleHtml, battleText };
}

export default async function DemoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return <p className="p-6 text-center">Unauthorized</p>;

  const { tickets, battleHtml, battleText } = await renderEmails();

  return (
    <EmailDemoPage
      tickets={tickets}
      battleHtml={battleHtml}
      battleText={battleText}
    />
  );
}
