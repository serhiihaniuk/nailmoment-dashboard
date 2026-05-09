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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Field,
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

export function AudienceVoteUpdateScreenDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Smartphone aria-hidden="true" data-icon="inline-start" />
          Екран очікування
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <AudienceVoteUpdateScreenPanel />
      </DialogContent>
    </Dialog>
  );
}

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

  function updateDraft<FieldName extends keyof AudienceVoteUpdateScreenFormDraft>(
    field: FieldName,
    value: AudienceVoteUpdateScreenFormDraft[FieldName]
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
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Екран очікування Mini App</DialogTitle>
        <DialogDescription>
          Текст, який бачать виборці, коли немає відкритого голосування.
        </DialogDescription>
      </DialogHeader>

      {isSchemaMissing ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Потрібна міграція бази даних</AlertTitle>
          <AlertDescription>
            Застосуйте drizzle/0029_audience_vote_update_screen.sql перед
            редагуванням цього екрана.
          </AlertDescription>
        </Alert>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Не вдалося завантажити екран очікування</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Не вдалося зберегти екран очікування</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {savedAt ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Екран очікування збережено</AlertTitle>
          <AlertDescription>
            Збережено {formatAudienceVoteDate(savedAt)}.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-lg" />
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="audience-vote-update-screen-title">
                Заголовок
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
                Повідомлення
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
              <FieldError>{errors.message}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {savedAt
                ? `Збережено ${formatAudienceVoteDate(savedAt)}`
                : updateScreen
                  ? `Оновлено ${formatAudienceVoteDate(updateScreen.updated_at)}`
                  : "Ще не збережено"}
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
              Зберегти
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
