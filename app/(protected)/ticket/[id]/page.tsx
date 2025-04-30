import { TicketCard } from "@/widgets/ticket-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="container mx-auto py-6">
      <TicketCard ticketId={id} />
    </div>
  );
}
