"use client";

import type { ReactNode } from "react";
import { CalendarClock, Loader2, Save } from "lucide-react";

import type { AudienceVote } from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useAudienceVoteScheduleDialog } from "../model/use-audience-vote-schedule-dialog";

export function AudienceVoteScheduleDialog({ vote }: { vote: AudienceVote }) {
  const state = useAudienceVoteScheduleDialog(vote);
  const isEditable = vote.status === "draft" || vote.status === "scheduled";

  if (!isEditable) {
    return null;
  }

  return (
    <Dialog open={state.open} onOpenChange={state.handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarClock aria-hidden="true" data-icon="inline-start" />
          Розклад
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Розклад голосування</DialogTitle>
          <DialogDescription>
            Додайте або змініть час для чернетки. Якщо очистити обидва поля,
            голосування знову стане незапланованим.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={state.handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Початок" message={state.errors.window_start}>
              <div className="relative">
                <CalendarClock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <Input
                  className="pl-9"
                  disabled={state.isPending}
                  onChange={(event) =>
                    state.updateDraft("window_start", event.target.value)
                  }
                  type="datetime-local"
                  value={state.draft.window_start}
                />
              </div>
            </Field>

            <Field label="Завершення" message={state.errors.window_end}>
              <div className="relative">
                <CalendarClock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <Input
                  className="pl-9"
                  disabled={state.isPending}
                  onChange={(event) =>
                    state.updateDraft("window_end", event.target.value)
                  }
                  type="datetime-local"
                  value={state.draft.window_end}
                />
              </div>
            </Field>
          </div>

          <p className="text-sm text-muted-foreground">
            Розклад можна редагувати лише до відкриття голосування.
          </p>

          {state.formError ? (
            <p className="text-sm font-medium text-destructive">
              {state.formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button disabled={state.isPending} type="submit">
              {state.isPending ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Save aria-hidden="true" data-icon="inline-start" />
              )}
              Зберегти розклад
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  label,
  message,
}: {
  children: ReactNode;
  label: string;
  message?: string | undefined;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
