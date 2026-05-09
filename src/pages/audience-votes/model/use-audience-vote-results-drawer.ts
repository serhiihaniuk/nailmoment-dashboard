"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  AudienceVote,
  AudienceVoteId,
  AudienceVoteResults,
} from "@/entities/audience-vote";
import { fetchAudienceVoteResults } from "../api/audience-votes-client";

export const audienceVoteResultsQueryKey = (voteId: AudienceVoteId) =>
  ["audienceVoteResults", voteId] as const;

export function useAudienceVoteResultsDrawer(vote: AudienceVote) {
  const [open, setOpen] = useState(false);

  const query = useQuery<AudienceVoteResults, Error>({
    enabled: open,
    queryFn: () => fetchAudienceVoteResults(vote.id),
    queryKey: audienceVoteResultsQueryKey(vote.id),
    refetchInterval: open ? 10_000 : false,
    staleTime: 5_000,
  });

  return {
    ...query,
    handleOpenChange: setOpen,
    open,
  };
}
