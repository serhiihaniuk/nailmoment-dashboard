"use client";

import { Suspense } from "react";
import { TicketsTable } from "./tickets-table";

export default function DashboardPage() {
  return (
    <div className="page-container flex flex-col gap-4 py-6">
      <Suspense>
        <TicketsTable />
      </Suspense>
    </div>
  );
}
