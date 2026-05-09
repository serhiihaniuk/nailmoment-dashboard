"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AudienceVote } from "@/entities/audience-vote";
import {
  updateAudienceVoteSchedule,
  type AudienceVoteScheduleApiError,
} from "../api/audience-votes-client";
import {
  createAudienceVoteOpeningMessageDraft,
  mapAudienceVoteOpeningMessageApiErrors,
  parseAudienceVoteOpeningMessageDraft,
  type AudienceVoteOpeningMessageDraft,
  type AudienceVoteOpeningMessageFieldErrors,
  type AudienceVoteOpeningMessageFormValues,
} from "./audience-vote-opening-message";
import { audienceVotesQueryKey } from "./use-create-audience-vote-dialog";

export function useAudienceVoteOpeningMessageDialog({
  vote,
}: {
  vote: AudienceVote;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AudienceVoteOpeningMessageDraft>(() =>
    createAudienceVoteOpeningMessageDraft(vote)
  );
  const [errors, setErrors] = useState<AudienceVoteOpeningMessageFieldErrors>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const mutation = useMutation<
    AudienceVote,
    AudienceVoteScheduleApiError,
    AudienceVoteOpeningMessageFormValues
  >({
    mutationFn: (body) => updateAudienceVoteSchedule(vote.id, body),
    onError: (error) => {
      const fieldErrors = mapAudienceVoteOpeningMessageApiErrors(error);
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
    setDraft(createAudienceVoteOpeningMessageDraft(vote));
    setErrors({});
    setFormError(null);
    mutation.reset();
  }

  function updateDraft<Field extends keyof AudienceVoteOpeningMessageDraft>(
    field: Field,
    value: AudienceVoteOpeningMessageDraft[Field]
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];

      if (field === "enabled") {
        delete next.message_text;
      }

      return next;
    });
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const parsed = parseAudienceVoteOpeningMessageDraft({ draft, vote });

    if (!parsed.ok) {
      setErrors(parsed.errors);

      if (Object.keys(parsed.errors).length === 0) {
        setFormError("Не вдалося зберегти стартове повідомлення.");
      }

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
