"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getTicketHtml } from "@/app/_actions/get-email"; // server action
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function TicketPage() {
  const { id } = useParams() as { id: string };
  const [html, setHtml] = useState<string | null | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    getTicketHtml(id)
      .then(setHtml)
      .catch(() => setHtml(null));
  }, [id]);

  const printPdf = () => {
    const win = iframeRef.current?.contentWindow;
    win?.focus();
    win?.print();
  };

  if (html === undefined) return <p className="p-6 text-center">Loading…</p>;
  if (html === null)
    return <p className="p-6 text-center">Ticket not found 🫤</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col gap-4 p-4">
      <Button onClick={printPdf} className="mx-auto max-w-content">
        Print PDF
      </Button>

      <iframe
        ref={iframeRef}
        srcDoc={html}
        className="w-full grow border-0"
        sandbox="allow-same-origin allow-modals"
      />
    </div>
  );
}
