"use client";

import { AddBattleTicketDialog } from "@/widgets/add-battle-ticket-dialog";
import { BattleTicketsTable } from "@/widgets/battle-ticket-table";
import React from "react";

export default function BattlePage() {
  // No data fetching or state management needed here for the table anymore

  return (
    <div className="w-full flex flex-col gap-4 max-w-screen-lg mx-auto p-4">
      <AddBattleTicketDialog />
      <BattleTicketsTable />
    </div>
  );
}
