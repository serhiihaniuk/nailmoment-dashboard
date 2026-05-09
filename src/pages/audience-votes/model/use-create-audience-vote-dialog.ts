"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import {
  audienceVoteKindSchema,
  createAudienceVoteStatusSchema,
  type AudienceVote,
} from "@/entities/audience-vote";
import {
  createAudienceVote,
  type CreateAudienceVoteApiError,
} from "../api/audience-votes-client";
import {
  createAudienceVoteDefaultDraft,
  mapCreateAudienceVoteApiErrors,
  parseCreateAudienceVoteDraft,
  type CreateAudienceVoteFieldErrors,
  type CreateAudienceVoteFormDraft,
  type CreateAudienceVoteFormValues,
} from "./audience-vote-form";
import { findAudienceVoteScheduleConflict } from "./audience-vote-schedule";

export const audienceVotesQueryKey = ["audienceVotes"] as const;

export function useCreateAudienceVoteDialog(votes: AudienceVote[]) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CreateAudienceVoteFormDraft>(
    createAudienceVoteDefaultDraft
  );
  const [errors, setErrors] = useState<CreateAudienceVoteFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation<
    AudienceVote,
    CreateAudienceVoteApiError,
    CreateAudienceVoteFormValues
  >({
    mutationFn: createAudienceVote,
    onError: (error) => {
      const fieldErrors = mapCreateAudienceVoteApiErrors(error);
      setErrors(fieldErrors);

      if (Object.keys(fieldErrors).length === 0) {
        setFormError(error.message);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audienceVotesQueryKey });
      handleOpenChange(false);
    },
  });

  function resetDialogState() {
    setDraft(createAudienceVoteDefaultDraft());
    setErrors({});
    setFormError(null);
    mutation.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    resetDialogState();
  }

  function updateDraft<Field extends keyof CreateAudienceVoteFormDraft>(
    field: Field,
    value: CreateAudienceVoteFormDraft[Field]
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function updateKind(value: string) {
    const parsed = audienceVoteKindSchema.safeParse(value);

    if (parsed.success) {
      updateDraft("kind", parsed.data);
    }
  }

  function updateStatus(value: string) {
    const parsed = createAudienceVoteStatusSchema.safeParse(value);

    if (parsed.success) {
      updateDraft("status", parsed.data);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const parsed = parseCreateAudienceVoteDraft(draft);

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    const conflict = findAudienceVoteScheduleConflict({
      schedule: parsed.data,
      votes,
    });

    if (conflict) {
      setErrors({
        window_end: conflict.message,
        window_start: conflict.message,
      });
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
    updateKind,
    updateStatus,
  };
}
