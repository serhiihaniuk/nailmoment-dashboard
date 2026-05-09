"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, MessageSquare, Save } from "lucide-react";

import type { AudienceVoteBotSettings } from "@/entities/audience-vote";
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
  fetchAudienceVoteBotSettings,
  updateAudienceVoteBotSettings,
  type AudienceVoteBotSettingsApiError,
} from "../api/audience-vote-bot-settings-client";
import { formatAudienceVoteDate } from "../model/audience-vote-form";
import {
  audienceVoteBotSettingsQueryKey,
  createAudienceVoteBotSettingsDraft,
  mapAudienceVoteBotSettingsApiErrors,
  parseAudienceVoteBotSettingsDraft,
  type AudienceVoteBotSettingsFieldErrors,
  type AudienceVoteBotSettingsFormDraft,
  type AudienceVoteBotSettingsFormValues,
} from "../model/audience-vote-bot-settings";

export function AudienceVoteBotSettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquare aria-hidden="true" data-icon="inline-start" />
          Повідомлення /start
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <AudienceVoteBotSettingsPanel />
      </DialogContent>
    </Dialog>
  );
}

export function AudienceVoteBotSettingsPanel() {
  const queryClient = useQueryClient();
  const [draftOverride, setDraftOverride] =
    useState<AudienceVoteBotSettingsFormDraft | null>(null);
  const [errors, setErrors] = useState<AudienceVoteBotSettingsFieldErrors>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const {
    data: botSettings,
    error,
    isError,
    isLoading,
  } = useQuery<AudienceVoteBotSettings, AudienceVoteBotSettingsApiError>({
    queryKey: audienceVoteBotSettingsQueryKey,
    queryFn: fetchAudienceVoteBotSettings,
    staleTime: 30_000,
  });

  const mutation = useMutation<
    AudienceVoteBotSettings,
    AudienceVoteBotSettingsApiError,
    AudienceVoteBotSettingsFormValues
  >({
    mutationFn: updateAudienceVoteBotSettings,
    onError: (apiError) => {
      const fieldErrors = mapAudienceVoteBotSettingsApiErrors(apiError);
      setErrors(fieldErrors);

      if (Object.keys(fieldErrors).length === 0) {
        setFormError(apiError.message);
      }
    },
    onSuccess: (savedBotSettings) => {
      queryClient.setQueryData(
        audienceVoteBotSettingsQueryKey,
        savedBotSettings
      );
      setDraftOverride(null);
      setErrors({});
      setFormError(null);
      setSavedAt(new Date());
    },
  });

  const draft =
    draftOverride ?? createAudienceVoteBotSettingsDraft(botSettings);
  const isSchemaMissing =
    isError && error.code === "missing_database_table";

  function updateDraft<FieldName extends keyof AudienceVoteBotSettingsFormDraft>(
    field: FieldName,
    value: AudienceVoteBotSettingsFormDraft[FieldName]
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

    const parsed = parseAudienceVoteBotSettingsDraft(draft);

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
        <DialogTitle>Повідомлення /start</DialogTitle>
        <DialogDescription>
          Текст, який бот надсилає після команд /start або /vote.
        </DialogDescription>
      </DialogHeader>

      {isSchemaMissing ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Потрібна міграція бази даних</AlertTitle>
          <AlertDescription>
            Застосуйте drizzle/0031_audience_vote_bot_settings.sql перед
            редагуванням цього повідомлення.
          </AlertDescription>
        </Alert>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Не вдалося завантажити повідомлення /start</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Не вдалося зберегти повідомлення /start</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {savedAt ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Повідомлення /start збережено</AlertTitle>
          <AlertDescription>
            Збережено {formatAudienceVoteDate(savedAt)}.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.start_message)}>
              <FieldLabel htmlFor="audience-vote-bot-start-message">
                Текст повідомлення
              </FieldLabel>
              <Textarea
                aria-invalid={errors.start_message ? true : undefined}
                className="min-h-32"
                disabled={isDisabled}
                id="audience-vote-bot-start-message"
                maxRows={8}
                onChange={(event) =>
                  updateDraft("start_message", event.target.value)
                }
                value={draft.start_message}
              />
              <FieldError>{errors.start_message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.start_button_text)}>
              <FieldLabel htmlFor="audience-vote-bot-start-button">
                Текст кнопки
              </FieldLabel>
              <Input
                aria-invalid={errors.start_button_text ? true : undefined}
                disabled={isDisabled}
                id="audience-vote-bot-start-button"
                onChange={(event) =>
                  updateDraft("start_button_text", event.target.value)
                }
                value={draft.start_button_text}
              />
              <FieldError>{errors.start_button_text}</FieldError>
            </Field>
          </FieldGroup>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Попередній перегляд
            </p>
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-white p-3 text-sm text-foreground shadow-xs">
              {draft.start_message}
            </p>
            <p className="mt-2 rounded-md border bg-white px-3 py-2 text-center text-sm font-medium">
              {draft.start_button_text}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {savedAt
                ? `Збережено ${formatAudienceVoteDate(savedAt)}`
                : botSettings
                  ? `Оновлено ${formatAudienceVoteDate(botSettings.updated_at)}`
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
