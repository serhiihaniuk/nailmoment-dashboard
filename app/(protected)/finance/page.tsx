"use client";

import { Suspense } from "react";
import { FinanceTable } from "@/widgets/finance-table";

export default function FinancePage() {
  return (
    <div className="page-container py-6">
      <Suspense>
        <FinanceTable />
      </Suspense>
    </div>
  );
}
