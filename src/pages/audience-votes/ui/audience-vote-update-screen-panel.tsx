"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

import type { AudienceVoteUpdateScreen } from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import {
  fetchAudienceVoteUpdateScreen,
  updateAudienceVoteUpdateScreen,
  type AudienceVoteUpdateScreenApiError,
} from "../api/audience-vote-update-screen-client";
import { formatAudienceVoteDate } from "../model/audience-vote-form";
import {
  audienceVoteUpdateScreenQueryKey,
  createAudienceVoteUpdateScreenDraft,
  mapAudienceVoteUpdateScreenApiErrors,
  parseAudienceVoteUpdateScreenDraft,
  type AudienceVoteUpdateScreenFieldErrors,
  type AudienceVoteUpdateScreenFormDraft,
  type AudienceVoteUpdateScreenFormValues,
} from "../model/audience-vote-update-screen";

export function AudienceVoteUpdateScreenPanel() {
  const queryClient = useQueryClient();
  const [draftOverride, setDraftOverride] =
    useState<AudienceVoteUpdateScreenFormDraft | null>(null);
  const [errors, setErrors] = useState<AudienceVoteUpdateScreenFieldErrors>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const {
    data: updateScreen,
    error,
    isError,
    isFetching,
    isLoading,
  } = useQuery<AudienceVoteUpdateScreen, AudienceVoteUpdateScreenApiError>({
    queryKey: audienceVoteUpdateScreenQueryKey,
    queryFn: fetchAudienceVoteUpdateScreen,
    staleTime: 30_000,
  });

  const mutation = useMutation<
    AudienceVoteUpdateScreen,
    AudienceVoteUpdateScreenApiError,
    AudienceVoteUpdateScreenFormValues
  >({
    mutationFn: updateAudienceVoteUpdateScreen,
    onError: (apiError) => {
      const fieldErrors = mapAudienceVoteUpdateScreenApiErrors(apiError);
      setErrors(fieldErrors);

      if (Object.keys(fieldErrors).length === 0) {
        setFormError(apiError.message);
      }
    },
    onSuccess: (savedUpdateScreen) => {
      queryClient.setQueryData(
        audienceVoteUpdateScreenQueryKey,
        savedUpdateScreen
      );
      setDraftOverride(null);
      setErrors({});
      setFormError(null);
      setSavedAt(new Date());
    },
  });

  const draft =
    draftOverride ?? createAudienceVoteUpdateScreenDraft(updateScreen);

  function updateDraft<Field extends keyof AudienceVoteUpdateScreenFormDraft>(
    field: Field,
    value: AudienceVoteUpdateScreenFormDraft[Field]
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
    setSavedAt(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSavedAt(null);

    const parsed = parseAudienceVoteUpdateScreenDraft(draft);

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    mutation.mutate(parsed.data);
  }

  const isPending = mutation.isPending;
  const isDisabled = isLoading || isPending;

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-3">Mini App update screen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shown to voters when no Audience Vote is open.
          </p>
        </div>
        {isFetching && !isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="animate-spin" size={14} />
            Refreshing
          </div>
        ) : null}
      </div>

      {isError ? (
        <p className="font-medium text-destructive">
          Could not load update screen: {error.message}
        </p>
      ) : null}

      {isLoading ? <Skeleton className="h-52 w-full rounded-lg" /> : null}

      {!isLoading ? (
        <form
          className="grid gap-4 rounded-lg border border-border/60 bg-white p-4 shadow-surface"
          onSubmit={handleSubmit}
        >
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="audience-vote-update-screen-title">
                Title
              </FieldLabel>
              <Input
                aria-invalid={errors.title ? true : undefined}
                disabled={isDisabled}
                id="audience-vote-update-screen-title"
                onChange={(event) => updateDraft("title", event.target.value)}
                value={draft.title}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.message)}>
              <FieldLabel htmlFor="audience-vote-update-screen-message">
                Message
              </FieldLabel>
              <Textarea
                aria-invalid={errors.message ? true : undefined}
                disabled={isDisabled}
                id="audience-vote-update-screen-message"
                maxRows={6}
                onChange={(event) =>
                  updateDraft("message", event.target.value)
                }
                value={draft.message}
              />
              <FieldDescription>
                This text is public in the Telegram Mini App.
              </FieldDescription>
              <FieldError>{errors.message}</FieldError>
            </Field>
          </FieldGroup>

          {formError ? (
            <p className="font-medium text-destructive">{formError}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {savedAt
                ? `Saved ${formatAudienceVoteDate(savedAt)}`
                : updateScreen
                  ? `Last updated ${formatAudienceVoteDate(updateScreen.updated_at)}`
                  : "Not saved yet"}
            </p>
            <Button disabled={isDisabled} type="submit">
              {isPending ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Save aria-hidden="true" data-icon="inline-start" />
              )}
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
