import { getTicketHtml } from "@/app/_actions/get-email";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const html = await getTicketHtml(id);

  if (!html) return <p className="p-6 text-center">Ticket not found 🫤</p>;

  return (
    <iframe
      srcDoc={html}
      className="min-h-screen w-full border-0 bg-gray-100"
      sandbox=""
    />
  );
}
