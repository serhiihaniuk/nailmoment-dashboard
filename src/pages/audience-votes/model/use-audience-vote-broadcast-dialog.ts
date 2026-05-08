"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  AudienceVote,
  AudienceVoteBroadcast,
  AudienceVoteBroadcastPreview,
} from "@/entities/audience-vote";
import {
  createAudienceVoteBroadcast,
  previewAudienceVoteBroadcast,
  type AudienceVoteBroadcastApiError,
} from "../api/audience-vote-broadcasts-client";
import {
  createAudienceVoteBroadcastDefaultDraft,
  mapAudienceVoteBroadcastApiErrors,
  parseAudienceVoteBroadcastDraft,
  type CreateAudienceVoteBroadcastFieldErrors,
  type CreateAudienceVoteBroadcastFormDraft,
  type CreateAudienceVoteBroadcastFormValues,
} from "./audience-vote-broadcast";

export const audienceVoteBroadcastsQueryKey = [
  "audienceVoteBroadcasts",
] as const;

export function useAudienceVoteBroadcastDialog(votes: AudienceVote[]) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CreateAudienceVoteBroadcastFormDraft>(() =>
    createAudienceVoteBroadcastDefaultDraft(votes)
  );
  const [errors, setErrors] = useState<CreateAudienceVoteBroadcastFieldErrors>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] =
    useState<AudienceVoteBroadcastPreview | null>(null);

  const previewMutation = useMutation<
    AudienceVoteBroadcastPreview,
    AudienceVoteBroadcastApiError,
    CreateAudienceVoteBroadcastFormValues
  >({
    mutationFn: previewAudienceVoteBroadcast,
    onError: handleMutationError,
    onMutate: () => {
      setFormError(null);
      setPreview(null);
    },
    onSuccess: setPreview,
  });

  const confirmMutation = useMutation<
    AudienceVoteBroadcast,
    AudienceVoteBroadcastApiError,
    CreateAudienceVoteBroadcastFormValues
  >({
    mutationFn: createAudienceVoteBroadcast,
    onError: handleMutationError,
    onMutate: () => setFormError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteBroadcastsQueryKey,
      });
      handleOpenChange(false);
    },
  });

  function resetDialogState() {
    setDraft(createAudienceVoteBroadcastDefaultDraft(votes));
    setErrors({});
    setFormError(null);
    setPreview(null);
    previewMutation.reset();
    confirmMutation.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    resetDialogState();
  }

  function updateDraft<Field extends keyof CreateAudienceVoteBroadcastFormDraft>(
    field: Field,
    value: CreateAudienceVoteBroadcastFormDraft[Field]
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
    setPreview(null);
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseCurrentDraft();

    if (parsed) {
      previewMutation.mutate(parsed);
    }
  }

  function confirmBroadcast() {
    const parsed = parseCurrentDraft();

    if (parsed) {
      confirmMutation.mutate(parsed);
    }
  }

  function parseCurrentDraft(): CreateAudienceVoteBroadcastFormValues | null {
    setErrors({});
    setFormError(null);

    const parsed = parseAudienceVoteBroadcastDraft(draft);

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return null;
    }

    return parsed.data;
  }

  function handleMutationError(error: AudienceVoteBroadcastApiError) {
    const fieldErrors = mapAudienceVoteBroadcastApiErrors(error);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length === 0) {
      setFormError(error.message);
    }
  }

  return {
    confirmBroadcast,
    draft,
    errors,
    formError,
    handleOpenChange,
    handlePreview,
    isConfirming: confirmMutation.isPending,
    isPending: previewMutation.isPending || confirmMutation.isPending,
    isPreviewing: previewMutation.isPending,
    open,
    preview,
    updateDraft,
  };
}
