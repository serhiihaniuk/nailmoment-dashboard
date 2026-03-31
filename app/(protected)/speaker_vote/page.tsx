"use client";

import { VoteResultsTable } from "@/widgets/vote-result";
import React from "react";

export default function DashboardPage() {
  return (
    <div className="page-container py-8 flex flex-col gap-6">
      <VoteResultsTable />
    </div>
  );
}
