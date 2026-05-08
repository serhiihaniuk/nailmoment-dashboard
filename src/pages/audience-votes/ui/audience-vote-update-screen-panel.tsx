"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Save, Smartphone } from "lucide-react";

import type { AudienceVoteUpdateScreen } from "@/entities/audience-vote";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
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
  const isSchemaMissing =
    isError && error.code === "missing_database_table";

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
  const isDisabled = isLoading || isPending || isSchemaMissing;

  return (
    <section>
      <Card className="gap-0 overflow-hidden shadow-surface">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Mini App update screen</CardTitle>
          <CardDescription>
            Public fallback shown when no Audience Vote is open.
          </CardDescription>
        {isFetching && !isLoading ? (
          <CardAction className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="animate-spin" />
            <span>Refreshing</span>
          </CardAction>
        ) : null}
        </CardHeader>
        <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-3">
            {isSchemaMissing ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Database migration required</AlertTitle>
                <AlertDescription>
                  Apply drizzle/0029_audience_vote_update_screen.sql before
                  editing this screen.
                </AlertDescription>
              </Alert>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Could not load update screen</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}

            {formError ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Could not save update screen</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {savedAt ? (
              <Alert>
                <CheckCircle2 aria-hidden="true" />
                <AlertTitle>Update screen saved</AlertTitle>
                <AlertDescription>
                  Saved {formatAudienceVoteDate(savedAt)}.
                </AlertDescription>
              </Alert>
            ) : null}

            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <FieldGroup className="gap-4">
                  <Field data-invalid={Boolean(errors.title)}>
                    <FieldLabel htmlFor="audience-vote-update-screen-title">
                      Title
                    </FieldLabel>
                    <Input
                      aria-invalid={errors.title ? true : undefined}
                      disabled={isDisabled}
                      id="audience-vote-update-screen-title"
                      onChange={(event) =>
                        updateDraft("title", event.target.value)
                      }
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
                      maxRows={7}
                      onChange={(event) =>
                        updateDraft("message", event.target.value)
                      }
                      value={draft.message}
                    />
                    <FieldDescription>
                      Ukrainian-only text shown inside Telegram Mini App.
                    </FieldDescription>
                    <FieldError>{errors.message}</FieldError>
                  </Field>
                </FieldGroup>

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
            )}
          </div>

          <MiniAppUpdateScreenPreview draft={draft} />
        </CardContent>
      </Card>
    </section>
  );
}

function MiniAppUpdateScreenPreview({
  draft,
}: {
  draft: AudienceVoteUpdateScreenFormDraft;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Smartphone aria-hidden="true" />
        Public preview
      </div>
      <div className="rounded-lg border border-border/70 bg-background p-4 shadow-xs">
        <p className="text-sm font-semibold">{draft.title}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {draft.message}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        This is the quiet waiting state voters see before the next vote opens.
      </p>
    </div>
  );
}
