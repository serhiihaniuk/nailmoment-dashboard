"use client";

import { BattleTicketsTable } from "@/widgets/battle-ticket-table";
import React from "react";

export default function BattlePage() {
  return (
    <div className="w-full flex flex-col gap-4 max-w-screen-lg mx-auto p-4 pb-10">
      <BattleTicketsTable />
    </div>
  );
}
