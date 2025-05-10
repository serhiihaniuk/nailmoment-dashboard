"use client";

import { TicketsTable } from "@/widgets/ticket-table";
import React from "react";

export default function DashboardPage() {
  return (
    <div className="w-full flex flex-col gap-4 max-w-screen-2xl mx-auto p-4">
      <TicketsTable />
    </div>
  );
}
