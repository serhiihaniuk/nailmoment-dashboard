"use client";

import type { ReactNode } from "react";
import { CalendarClock, Loader2, MessageSquare, Save } from "lucide-react";

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
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { getOpenEndedVoteScheduleNotice } from "../model/audience-vote-schedule";
import { useAudienceVoteScheduleDialog } from "../model/use-audience-vote-schedule-dialog";

export function AudienceVoteScheduleDialog({
  vote,
  votes,
}: {
  vote: AudienceVote;
  votes: AudienceVote[];
}) {
  const state = useAudienceVoteScheduleDialog({ vote, votes });
  const isOpenVote = vote.status === "open";
  const isEditable =
    vote.status === "draft" || vote.status === "scheduled" || isOpenVote;
  const openEndedVoteNotice = getOpenEndedVoteScheduleNotice({
    currentVoteId: vote.id,
    votes,
  });

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
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Розклад голосування</DialogTitle>
          <DialogDescription>
            Додайте або змініть час для чернетки. Якщо очистити обидва поля,
            голосування знову стане незапланованим.
          </DialogDescription>
          {isOpenVote ? (
            <p className="text-sm text-muted-foreground">
              Голосування вже відкрите. Можна змінити лише час завершення.
            </p>
          ) : null}
          {openEndedVoteNotice ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
              {openEndedVoteNotice}
            </p>
          ) : null}
        </DialogHeader>

        <form className="grid gap-4" onSubmit={state.handleSubmit}>
          <div className="grid gap-4">
            <Field label="Початок" message={state.errors.window_start}>
              <div className="relative min-w-0 overflow-hidden">
                <CalendarClock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <Input
                  className="block min-w-0 max-w-full min-inline-0 max-inline-full appearance-none overflow-hidden pl-9 pr-3 inline-full"
                  disabled={state.isPending || isOpenVote}
                  onChange={(event) =>
                    state.updateDraft("window_start", event.target.value)
                  }
                  type="datetime-local"
                  value={state.draft.window_start}
                />
              </div>
            </Field>

            <Field label="Завершення" message={state.errors.window_end}>
              <div className="relative min-w-0 overflow-hidden">
                <CalendarClock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <Input
                  className="block min-w-0 max-w-full min-inline-0 max-inline-full appearance-none overflow-hidden pl-9 pr-3 inline-full"
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

          {!isOpenVote ? (
            <div className="grid gap-3 rounded-md border border-border/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Label
                    className="flex items-center gap-2"
                    htmlFor="opening-broadcast-enabled"
                  >
                    <MessageSquare aria-hidden="true" size={14} />
                    Повідомлення при старті
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Telegram-розсилка буде створена, коли голосування відкриється.
                  </p>
                </div>
                <Switch
                  checked={state.draft.opening_broadcast_enabled}
                  disabled={state.isPending}
                  id="opening-broadcast-enabled"
                  onCheckedChange={(checked) =>
                    state.updateDraft("opening_broadcast_enabled", checked)
                  }
                />
              </div>

              {state.draft.opening_broadcast_enabled ? (
                <>
                  <Field
                    label="Текст повідомлення"
                    message={state.errors.opening_broadcast_message_text}
                  >
                    <Textarea
                      aria-invalid={
                        state.errors.opening_broadcast_message_text
                          ? true
                          : undefined
                      }
                      className="min-h-32 resize-y"
                      disabled={state.isPending}
                      maxRows={8}
                      onChange={(event) =>
                        state.updateDraft(
                          "opening_broadcast_message_text",
                          event.target.value
                        )
                      }
                      placeholder="Повідомлення українською для Telegram"
                      value={state.draft.opening_broadcast_message_text}
                    />
                  </Field>

                  <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                    <div>
                      <Label htmlFor="opening-broadcast-open-button">
                        Кнопка відкриття голосування
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Додає кнопку Mini App до повідомлення в Telegram.
                      </p>
                    </div>
                    <Switch
                      checked={
                        state.draft.opening_broadcast_include_open_button
                      }
                      disabled={state.isPending}
                      id="opening-broadcast-open-button"
                      onCheckedChange={(checked) =>
                        state.updateDraft(
                          "opening_broadcast_include_open_button",
                          checked
                        )
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <p className="hidden">
            Розклад можна редагувати лише до відкриття голосування.
          </p>
          <p className="text-sm text-muted-foreground">
            {isOpenVote
              ? "Початок зафіксований. Змініть завершення, щоб продовжити або скоротити голосування."
              : "Розклад можна редагувати до відкриття голосування."}
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
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      {children}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
