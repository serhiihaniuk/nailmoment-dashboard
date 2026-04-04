import { getTicketHtml, getTicketText } from "@/app/_actions/get-email";
import { EmailPreview } from "./email-preview";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [html, text] = await Promise.all([
    getTicketHtml(id),
    getTicketText(id),
  ]);

  if (!html || !text)
    return <p className="p-6 text-center">Ticket not found 🫤</p>;

  return <EmailPreview html={html} text={text} />;
}
