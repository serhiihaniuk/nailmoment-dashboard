"use client";

import { Loader2, Lock, Play } from "lucide-react";

import type { AudienceVote } from "@/entities/audience-vote";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button, buttonVariants } from "@/shared/ui/button";
import { useAudienceVoteLifecycleActions } from "../model/use-audience-vote-lifecycle-actions";

export function AudienceVoteLifecycleActions({
  vote,
}: {
  vote: AudienceVote;
}) {
  const state = useAudienceVoteLifecycleActions(vote);

  return (
    <div className="flex min-w-32 flex-col items-end gap-1.5">
      <div className="flex justify-end gap-1.5">
        {vote.status === "draft" || vote.status === "scheduled" ? (
          <OpenVoteAction
            disabled={state.isPending}
            isOpening={state.isOpening}
            onOpen={state.openVote}
            vote={vote}
          />
        ) : null}

        {vote.status === "open" ? (
          <CloseVoteAction
            disabled={state.isPending}
            isClosing={state.isClosing}
            onClose={state.closeVote}
            vote={vote}
          />
        ) : null}

        {vote.status === "closed" ? (
          <span className="text-xs font-medium text-muted-foreground">
            Final
          </span>
        ) : null}
      </div>

      {state.errorMessage ? (
        <p className="max-w-72 text-right text-xs font-medium text-destructive">
          {state.errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function OpenVoteAction({
  disabled,
  isOpening,
  onOpen,
  vote,
}: {
  disabled: boolean;
  isOpening: boolean;
  onOpen: () => void;
  vote: AudienceVote;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled} size="sm" variant="outline">
          {isOpening ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Play aria-hidden="true" data-icon="inline-start" />
          )}
          Open
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Open Audience Vote?</AlertDialogTitle>
          <AlertDialogDescription>
            {vote.title} will become the current Mini App voting stage. The
            server will validate candidates, media, and the one-open-vote rule.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onOpen}>
            <Play aria-hidden="true" data-icon="inline-start" />
            Open vote
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CloseVoteAction({
  disabled,
  isClosing,
  onClose,
  vote,
}: {
  disabled: boolean;
  isClosing: boolean;
  onClose: () => void;
  vote: AudienceVote;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled} size="sm" variant="destructive">
          {isClosing ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Lock aria-hidden="true" data-icon="inline-start" />
          )}
          Close
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close Audience Vote?</AlertDialogTitle>
          <AlertDialogDescription>
            {vote.title} will be final. It cannot be reopened after closing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={onClose}
          >
            <Lock aria-hidden="true" data-icon="inline-start" />
            Close vote
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
