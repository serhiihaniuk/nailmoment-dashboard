"use client";

import { VoteResultsTable } from "@/widgets/vote-result";
import React from "react";

export default function SpeakerVotePage() {
  return (
    <div className="page-container py-6">
      <VoteResultsTable />
    </div>
  );
}
