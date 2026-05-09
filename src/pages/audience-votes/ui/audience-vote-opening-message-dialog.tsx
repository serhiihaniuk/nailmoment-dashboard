"use client";

import type { ReactNode } from "react";
import { Loader2, MessageSquare, Save } from "lucide-react";

import type { AudienceVote } from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
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
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { useAudienceVoteOpeningMessageDialog } from "../model/use-audience-vote-opening-message-dialog";

export function AudienceVoteOpeningMessageDialog({
  vote,
}: {
  vote: AudienceVote;
}) {
  const state = useAudienceVoteOpeningMessageDialog({ vote });
  const isConfigured = Boolean(vote.opening_broadcast_message_text);
  const isEditable = vote.status === "draft" || vote.status === "scheduled";
  const enabledSwitchId = `opening-message-enabled-${vote.id}`;
  const openButtonSwitchId = `opening-message-open-button-${vote.id}`;

  if (!isEditable) {
    return null;
  }

  return (
    <Dialog open={state.open} onOpenChange={state.handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquare aria-hidden="true" data-icon="inline-start" />
          Стартове повідомлення
          <Badge
            className="ml-0.5 rounded-md px-1.5 py-0 text-[10px]"
            variant={isConfigured ? "success" : "outline"}
          >
            {isConfigured ? "Є" : "Немає"}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Стартове повідомлення</DialogTitle>
          <DialogDescription>
            Це повідомлення буде створено як розсилка, коли голосування
            відкриється.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={state.handleSubmit}>
          <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3">
            <div className="min-w-0">
              <Label htmlFor={enabledSwitchId}>Надіслати при старті</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Якщо вимкнути, збережене стартове повідомлення буде очищено.
              </p>
            </div>
            <Switch
              checked={state.draft.enabled}
              disabled={state.isPending}
              id={enabledSwitchId}
              onCheckedChange={(checked) =>
                state.updateDraft("enabled", checked)
              }
            />
          </div>

          {state.draft.enabled ? (
            <>
              <Field label="Текст повідомлення" message={state.errors.message_text}>
                <Textarea
                  aria-invalid={state.errors.message_text ? true : undefined}
                  className="min-h-32 resize-y"
                  disabled={state.isPending}
                  maxRows={8}
                  onChange={(event) =>
                    state.updateDraft("message_text", event.target.value)
                  }
                  placeholder="Повідомлення українською для Telegram"
                  value={state.draft.message_text}
                />
              </Field>

              <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                <div className="min-w-0">
                  <Label htmlFor={openButtonSwitchId}>
                    Кнопка відкриття голосування
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Додає кнопку Mini App до повідомлення в Telegram.
                  </p>
                </div>
                <Switch
                  checked={state.draft.include_open_button}
                  disabled={state.isPending}
                  id={openButtonSwitchId}
                  onCheckedChange={(checked) =>
                    state.updateDraft("include_open_button", checked)
                  }
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Стартове повідомлення не буде створюватися.
            </p>
          )}

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
              Зберегти повідомлення
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
