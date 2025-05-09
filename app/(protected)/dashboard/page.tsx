"use client";

import { AddTicketDialog } from "@/widgets/add-ticket-dialog";
import { TicketsTable } from "@/widgets/ticket-table";
import React from "react";

export default function DashboardPage() {
  // No data fetching or state management needed here for the table anymore

  return (
    <div className="w-full flex flex-col gap-4 max-w-screen-lg mx-auto p-4">
      <AddTicketDialog />
      <TicketsTable />
    </div>
  );
}
