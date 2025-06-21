"use client";

import { VoteResultsTable } from "@/widgets/vote-result";
import React from "react";

export default function DashboardPage() {
  return (
    <div className="w-full flex flex-col gap-4 max-w-xl mx-auto p-4">
      <VoteResultsTable />
    </div>
  );
}
