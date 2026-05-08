"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import type { AudienceVoteUpdateScreenSettings } from "@/entities/audience-vote";
import {
  fetchAudienceVoteUpdateScreen,
  updateAudienceVoteUpdateScreen,
  type AudienceVoteUpdateScreenApiError,
} from "../api/audience-votes-client";
import {
  createAudienceVoteUpdateScreenDraft,
  mapAudienceVoteUpdateScreenApiErrors,
  parseAudienceVoteUpdateScreenDraft,
  type AudienceVoteUpdateScreenDraft,
  type AudienceVoteUpdateScreenFieldErrors,
  type AudienceVoteUpdateScreenFormValues,
} from "./audience-vote-update-screen-form";

export const audienceVoteUpdateScreenQueryKey = [
  "audienceVoteUpdateScreen",
] as const;

export function useAudienceVoteUpdateScreen() {
  const queryClient = useQueryClient();
  const [draftOverride, setDraftOverride] =
    useState<AudienceVoteUpdateScreenDraft | null>(null);
  const [errors, setErrors] = useState<AudienceVoteUpdateScreenFieldErrors>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery<AudienceVoteUpdateScreenSettings, Error>({
    queryFn: fetchAudienceVoteUpdateScreen,
    queryKey: audienceVoteUpdateScreenQueryKey,
    staleTime: 10_000,
  });

  const mutation = useMutation<
    AudienceVoteUpdateScreenSettings,
    AudienceVoteUpdateScreenApiError,
    AudienceVoteUpdateScreenFormValues
  >({
    mutationFn: updateAudienceVoteUpdateScreen,
    onError: (error) => {
      const fieldErrors = mapAudienceVoteUpdateScreenApiErrors(error);
      setErrors(fieldErrors);

      if (Object.keys(fieldErrors).length === 0) {
        setFormError(error.message);
      }
    },
    onSuccess: async (screen) => {
      setDraftOverride(createAudienceVoteUpdateScreenDraft(screen));
      await queryClient.invalidateQueries({
        queryKey: audienceVoteUpdateScreenQueryKey,
      });
    },
  });

  const draft =
    draftOverride ?? createAudienceVoteUpdateScreenDraft(query.data);

  function updateDraft<Field extends keyof AudienceVoteUpdateScreenDraft>(
    field: Field,
    value: AudienceVoteUpdateScreenDraft[Field]
  ) {
    setDraftOverride((current) => ({
      ...(current ?? draft),
      [field]: value,
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
    mutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const parsed = parseAudienceVoteUpdateScreenDraft(draft);

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    mutation.mutate(parsed.data);
  }

  return {
    draft,
    errors,
    formError,
    handleSubmit,
    isError: query.isError,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isPending: mutation.isPending,
    isSaved: mutation.isSuccess,
    loadError: query.error,
    updateDraft,
  };
}
