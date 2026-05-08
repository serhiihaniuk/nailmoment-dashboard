"use client";

import type { ReactNode } from "react";
import { Loader2, Radio, Send } from "lucide-react";

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
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
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
          New broadcast
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Audience Vote Broadcast</DialogTitle>
          <DialogDescription>
            Preview and confirm before any Telegram delivery rows are created.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handlePreview}>
          <Field label="Audience Vote" message={errors.audience_vote_id}>
            <Select
              disabled={isPending}
              onValueChange={(value) =>
                updateDraft("audience_vote_id", value)
              }
              value={draft.audience_vote_id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose vote" />
              </SelectTrigger>
              <SelectContent>
                {votes.map((vote) => (
                  <SelectItem key={vote.id} value={vote.id}>
                    {vote.title} / {formatAudienceVoteKind(vote.kind)} /{" "}
                    {formatAudienceVoteStatus(vote.status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Message text" message={errors.message_text}>
            <Textarea
              className="min-h-36 resize-y"
              disabled={isPending}
              onChange={(event) =>
                updateDraft("message_text", event.target.value)
              }
              placeholder="Ukrainian Telegram message"
              value={draft.message_text}
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
            <div>
              <Label htmlFor="broadcast-open-button">Open-voting button</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Adds the Mini App button to the Telegram message.
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

          {preview ? (
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Preview</p>
                <p className="text-sm text-muted-foreground">
                  {preview.estimated_recipient_count} active voters
                </p>
              </div>
              <p className="whitespace-pre-wrap rounded-md bg-white p-3 text-sm text-foreground shadow-xs">
                {preview.message_text}
              </p>
              {preview.include_open_button ? (
                <p className="text-xs font-medium text-muted-foreground">
                  Includes Mini App open-voting button.
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
              Preview
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
              Confirm
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
