"use client";

import { Suspense } from "react";
import { TicketsTable } from "@/widgets/ticket-table";

export default function DashboardPage() {
  return (
    <div className="page-container py-6">
      <Suspense>
        <TicketsTable />
      </Suspense>
    </div>
  );
}
