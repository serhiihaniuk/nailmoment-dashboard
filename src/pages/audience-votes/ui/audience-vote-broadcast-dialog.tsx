"use client";

import type { ReactNode } from "react";
import { ExternalLink, Loader2, Radio, Send } from "lucide-react";

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
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import {
  audienceVoteTelegramBotOptions,
  formatAudienceVoteTelegramBot,
} from "../model/audience-vote-form";
import { useAudienceVoteBroadcastDialog } from "../model/use-audience-vote-broadcast-dialog";

interface AudienceVoteBroadcastDialogProps {
  votes: AudienceVote[];
  preselectedVote?: AudienceVote | null;
  onOpenChange?: (open: boolean) => void;
}

export function AudienceVoteBroadcastDialog({
  votes,
  preselectedVote,
  onOpenChange: onOpenChangeProp,
}: AudienceVoteBroadcastDialogProps) {
  const {
    confirmBroadcast,
    draft,
    errors,
    formError,
    handleOpenChange,
    handlePreview,
    isConfirming,
    isPending,
    isPreviewing,
    open,
    preview,
    updateDraft,
    updateTelegramBot,
  } = useAudienceVoteBroadcastDialog(votes, {
    preselectedVote,
    onOpenChange: onOpenChangeProp,
  });
  const disabled = votes.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled} size="sm" variant="outline">
          <Radio aria-hidden="true" size={14} />
          Нова розсилка
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Створити розсилку голосування</DialogTitle>
          <DialogDescription>
            Перевірте повідомлення перед створенням доставок у Telegram.
          </DialogDescription>
        </DialogHeader>

        <form className="grid min-w-0 gap-4" onSubmit={handlePreview}>
          {errors.audience_vote_id ? (
            <p className="text-sm font-medium text-destructive">
              {errors.audience_vote_id}
            </p>
          ) : null}

          <Field label="Telegram bot" message={errors.telegram_bot}>
            <Select
              disabled={isPending}
              onValueChange={updateTelegramBot}
              value={draft.telegram_bot}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audienceVoteTelegramBotOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Текст повідомлення" message={errors.message_text}>
            <Textarea
              className="min-h-36 resize-y"
              disabled={isPending}
              onChange={(event) =>
                updateDraft("message_text", event.target.value)
              }
              placeholder="Повідомлення українською для Telegram"
              value={draft.message_text}
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
            <div>
              <Label htmlFor="broadcast-open-button">
                Кнопка відкриття голосування
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Додає кнопку Mini App до повідомлення в Telegram.
              </p>
            </div>
            <Switch
              checked={draft.include_open_button}
              disabled={isPending}
              id="broadcast-open-button"
              onCheckedChange={(checked) =>
                updateDraft("include_open_button", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
            <div>
              <Label htmlFor="broadcast-landing-button">
                Кнопка сайту Nail Moment
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Додає кнопку з посиланням на nailmoment.pl.
              </p>
            </div>
            <Switch
              checked={draft.include_landing_button}
              disabled={isPending}
              id="broadcast-landing-button"
              onCheckedChange={(checked) =>
                updateDraft("include_landing_button", checked)
              }
            />
          </div>

          {preview ? (
            <div className="grid min-w-0 gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Попередній перегляд</p>
                <p className="text-sm text-muted-foreground">
                  {formatAudienceVoteTelegramBot(preview.telegram_bot)} -{" "}
                  {preview.estimated_recipient_count} активних виборців
                </p>
              </div>
              <p className="min-w-0 overflow-hidden whitespace-pre-wrap wrap-break-word rounded-md bg-white p-3 text-sm text-foreground shadow-xs">
                {preview.message_text}
              </p>
              {preview.include_open_button ? (
                <p className="text-xs font-medium text-muted-foreground">
                  Кнопка відкриття Mini App буде додана.
                </p>
              ) : null}
              {preview.include_landing_button ? (
                <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <ExternalLink aria-hidden="true" size={12} />
                  Кнопка сайту Nail Moment буде додана.
                </p>
              ) : null}
            </div>
          ) : null}

          {formError ? (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button disabled={isPending} type="submit" variant="outline">
              {isPreviewing ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : null}
              Переглянути
            </Button>
            <Button
              disabled={!preview || isPending}
              onClick={confirmBroadcast}
              type="button"
            >
              {isConfirming ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Send aria-hidden="true" data-icon="inline-start" />
              )}
              Підтвердити
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
