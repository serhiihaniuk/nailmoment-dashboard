"use client";

import { BattleTicketsTable } from "@/widgets/battle-ticket-table";
import React from "react";

export default function BattlePage() {
  return (
    <div className="page-container py-8 flex flex-col gap-6">
      <BattleTicketsTable />
    </div>
  );
}
