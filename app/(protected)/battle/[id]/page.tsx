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
    <div className="page-container py-8 px-4 pb-16 flex flex-col gap-6">
      <BattleTicketCard battleTicketId={id} />

      <Button
        className="mt-6 w-28 max-w-md mx-auto block"
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
