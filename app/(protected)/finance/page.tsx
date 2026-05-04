"use client";

import { Suspense } from "react";
import { FinanceTable } from "@/widgets/finance-table";

export default function FinancePage() {
  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-420">
        <Suspense>
          <FinanceTable />
        </Suspense>
      </div>
    </div>
  );
}
