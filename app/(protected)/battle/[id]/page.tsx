import { Button } from "@/components/ui/button";
import { BattleTicketCard } from "@/widgets/battle-ticket-card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="container mx-auto py-6 px-4">
      <BattleTicketCard battleTicketId={id} />

      <Button
        className="mx-auto mt-6 block shadow-md w-28"
        variant="secondary"
        size="sm"
        asChild
      >
        <Link href="/battle" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
      </Button>
    </div>
  );
}
