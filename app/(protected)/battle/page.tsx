"use client";

import { BattleTicketsTable } from "@/widgets/battle-ticket-table";
import React, { Suspense } from "react";

export default function BattlePage() {
  return (
    <div className="page-container py-6">
      <Suspense>
        <BattleTicketsTable />
      </Suspense>
    </div>
  );
}
