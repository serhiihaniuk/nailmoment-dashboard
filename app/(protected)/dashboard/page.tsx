"use client";

import { TicketsTable } from "@/widgets/ticket-table";
import React from "react";

export default function DashboardPage() {
  // No data fetching or state management needed here for the table anymore

  return (
    <div className="container mx-auto p-4">
      <TicketsTable />
    </div>
  );
}
