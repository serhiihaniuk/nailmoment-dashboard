"use client";

import { ArrivalFooter, TicketPanelContent } from "@/widgets/ticket-panel";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="page-container py-6 max-w-lg">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft size={13} />
        Квитки
      </Link>

      <div className="bg-white rounded-xl border border-border/60 shadow-surface overflow-hidden">
        <div className="px-6 pb-6">
          <TicketPanelContent ticketId={id} />
        </div>
        <div className="border-t border-border/60 bg-white px-6 py-4">
          <ArrivalFooter ticketId={id} />
        </div>
      </div>
    </div>
  );
}
