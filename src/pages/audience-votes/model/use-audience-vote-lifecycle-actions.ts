"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AudienceVote, AudienceVoteId } from "@/entities/audience-vote";
import {
  closeAudienceVote,
  deleteDraftAudienceVote,
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

  const deleteMutation = useMutation<
    AudienceVoteId,
    AudienceVoteLifecycleApiError,
    void
  >({
    mutationFn: () => deleteDraftAudienceVote(vote.id),
    onError: setError,
    onMutate: () => setError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audienceVotesQueryKey });
    },
  });

  return {
    closeVote: () => closeMutation.mutate(),
    deleteDraftVote: () => deleteMutation.mutate(),
    errorMessage: error ? formatAudienceVoteLifecycleApiError(error) : null,
    isClosing: closeMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isOpening: openMutation.isPending,
    isPending:
      openMutation.isPending ||
      closeMutation.isPending ||
      deleteMutation.isPending,
    openVote: () => openMutation.mutate(),
  };
}
