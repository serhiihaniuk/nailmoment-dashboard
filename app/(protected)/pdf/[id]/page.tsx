import { cookies } from "next/headers";

/** always render on-demand, no static cache */
export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(`api/pdf/${id}`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });

  if (!res.ok) {
    return <p className="p-6 text-center">Ticket not found 🫤</p>;
  }

  const html = await res.text();

  return (
    <div
      className="min-h-screen bg-gray-100"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
