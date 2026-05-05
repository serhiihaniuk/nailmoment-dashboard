"use client";

import { Suspense } from "react";
import { BattleTicketsTable } from "./battle-tickets-table";

export default function BattlePage() {
  return (
    <div className="page-container py-6">
      <Suspense>
        <BattleTicketsTable />
      </Suspense>
    </div>
  );
}
