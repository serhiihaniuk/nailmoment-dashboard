"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AudienceVote } from "@/entities/audience-vote";
import {
  closeAudienceVote,
  openAudienceVote,
  type AudienceVoteLifecycleApiError,
} from "../api/audience-votes-client";
import {
  formatAudienceVoteLifecycleApiError,
} from "./audience-vote-lifecycle";
import { audienceVotesQueryKey } from "./use-create-audience-vote-dialog";

export function useAudienceVoteLifecycleActions(vote: AudienceVote) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<AudienceVoteLifecycleApiError | null>(
    null
  );

  const openMutation = useMutation<
    AudienceVote,
    AudienceVoteLifecycleApiError,
    void
  >({
    mutationFn: () => openAudienceVote(vote.id),
    onError: setError,
    onMutate: () => setError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audienceVotesQueryKey });
    },
  });

  const closeMutation = useMutation<
    AudienceVote,
    AudienceVoteLifecycleApiError,
    void
  >({
    mutationFn: () => closeAudienceVote(vote.id),
    onError: setError,
    onMutate: () => setError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audienceVotesQueryKey });
    },
  });

  return {
    closeVote: () => closeMutation.mutate(),
    errorMessage: error ? formatAudienceVoteLifecycleApiError(error) : null,
    isClosing: closeMutation.isPending,
    isOpening: openMutation.isPending,
    isPending: openMutation.isPending || closeMutation.isPending,
    openVote: () => openMutation.mutate(),
  };
}
