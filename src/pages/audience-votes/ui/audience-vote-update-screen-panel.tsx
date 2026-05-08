"use client";

import { CheckCircle2, Loader2, MessageSquareText, Save } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { useAudienceVoteUpdateScreen } from "../model/use-audience-vote-update-screen";

export function AudienceVoteUpdateScreenPanel() {
  const {
    draft,
    errors,
    formError,
    handleSubmit,
    isError,
    isFetching,
    isLoading,
    isPending,
    isSaved,
    loadError,
    updateDraft,
  } = useAudienceVoteUpdateScreen();

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-lg" />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-white p-5 text-sm text-destructive">
        Could not load update screen: {loadError?.message}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border/60 bg-white p-5 shadow-surface">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MessageSquareText aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Update screen</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ukrainian Mini App content for the waiting state.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isPending ? (
              <span className="text-xs text-muted-foreground">
                Refreshing...
              </span>
            ) : null}
            {isSaved && !isPending ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Saved
              </span>
            ) : null}
            <Button disabled={isPending} size="sm" type="submit">
              {isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Save
            </Button>
          </div>
        </div>

        <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.headline)}>
            <FieldLabel htmlFor="audience-vote-update-headline">
              Headline
            </FieldLabel>
            <Input
              aria-invalid={Boolean(errors.headline)}
              disabled={isPending}
              id="audience-vote-update-headline"
              onChange={(event) => updateDraft("headline", event.target.value)}
              placeholder="Голосування скоро"
              value={draft.headline}
            />
            <FieldError>{errors.headline}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.button_label)}>
            <FieldLabel htmlFor="audience-vote-update-button-label">
              Button label
            </FieldLabel>
            <Input
              aria-invalid={Boolean(errors.button_label)}
              disabled={isPending}
              id="audience-vote-update-button-label"
              onChange={(event) =>
                updateDraft("button_label", event.target.value)
              }
              placeholder="Відкрити Instagram"
              value={draft.button_label}
            />
            <FieldError>{errors.button_label}</FieldError>
          </Field>

          <Field
            className="sm:col-span-2"
            data-invalid={Boolean(errors.body)}
          >
            <FieldLabel htmlFor="audience-vote-update-body">Body</FieldLabel>
            <Textarea
              aria-invalid={Boolean(errors.body)}
              disabled={isPending}
              id="audience-vote-update-body"
              maxRows={5}
              onChange={(event) => updateDraft("body", event.target.value)}
              placeholder="Нове голосування зʼявиться тут після старту."
              value={draft.body}
            />
            <FieldError>{errors.body}</FieldError>
          </Field>

          <Field
            className="sm:col-span-2"
            data-invalid={Boolean(errors.button_url)}
          >
            <FieldLabel htmlFor="audience-vote-update-button-url">
              Button link
            </FieldLabel>
            <Input
              aria-invalid={Boolean(errors.button_url)}
              disabled={isPending}
              id="audience-vote-update-button-url"
              onChange={(event) =>
                updateDraft("button_url", event.target.value)
              }
              placeholder="https://nailmoment.pl"
              value={draft.button_url}
            />
            <FieldError>{errors.button_url}</FieldError>
          </Field>
        </FieldGroup>

        {formError ? (
          <p className="text-sm font-medium text-destructive">{formError}</p>
        ) : null}
      </form>
    </section>
  );
}
