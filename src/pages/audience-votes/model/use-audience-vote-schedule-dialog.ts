"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AudienceVote } from "@/entities/audience-vote";
import {
  updateAudienceVoteSchedule,
  type AudienceVoteScheduleApiError,
} from "../api/audience-votes-client";
import {
  createAudienceVoteScheduleDraft,
  findAudienceVoteScheduleConflict,
  mapAudienceVoteScheduleApiErrors,
  mapAudienceVoteScheduleConflictToFieldErrors,
  parseAudienceVoteScheduleDraft,
  type AudienceVoteScheduleFieldErrors,
  type AudienceVoteScheduleDraft,
  type AudienceVoteScheduleFormValues,
} from "./audience-vote-schedule";
import { audienceVotesQueryKey } from "./use-create-audience-vote-dialog";

export function useAudienceVoteScheduleDialog({
  vote,
  votes,
}: {
  vote: AudienceVote;
  votes: AudienceVote[];
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AudienceVoteScheduleDraft>(() =>
    createAudienceVoteScheduleDraft(vote)
  );
  const [errors, setErrors] = useState<AudienceVoteScheduleFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation<
    AudienceVote,
    AudienceVoteScheduleApiError,
    AudienceVoteScheduleFormValues
  >({
    mutationFn: (body) => updateAudienceVoteSchedule(vote.id, body),
    onError: (error) => {
      const fieldErrors = mapAudienceVoteScheduleApiErrors(error);
      setErrors(fieldErrors);

      if (Object.keys(fieldErrors).length === 0) {
        setFormError(error.message);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audienceVotesQueryKey });
      setOpen(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setDraft(createAudienceVoteScheduleDraft(vote));
    }

    setErrors({});
    setFormError(null);
    mutation.reset();
  }

  function updateDraft<Field extends keyof AudienceVoteScheduleDraft>(
    field: Field,
    value: AudienceVoteScheduleDraft[Field]
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];

      if (field === "opening_broadcast_enabled") {
        delete next.opening_broadcast_message_text;
      }

      return next;
    });
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextStatus =
      vote.status === "open"
        ? "open"
        : draft.window_start || draft.window_end
          ? "scheduled"
          : "draft";
    const parsed = parseAudienceVoteScheduleDraft({
      ...draft,
      status: nextStatus,
    });

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    const conflict = findAudienceVoteScheduleConflict({
      excludeVoteId: vote.id,
      schedule: parsed.data,
      votes,
    });

    if (conflict) {
      setErrors(mapAudienceVoteScheduleConflictToFieldErrors(conflict));
      setFormError(conflict.message);
      return;
    }

    mutation.mutate(parsed.data);
  }

  return {
    draft,
    errors,
    formError,
    handleOpenChange,
    handleSubmit,
    isPending: mutation.isPending,
    open,
    updateDraft,
  };
}
