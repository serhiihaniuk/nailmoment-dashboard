"use client";

import { TicketsTable } from "@/widgets/ticket-table";
import React from "react";

export default function DashboardPage() {
  // No data fetching or state management needed here for the table anymore

  return (
    <div className="w-full max-w-screen-lg mx-auto p-4">
      <TicketsTable />
    </div>
  );
}
