"use client";

import { Loader2, Lock, Play, Trash2 } from "lucide-react";

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
    <div className="flex min-w-0 flex-col items-start gap-1.5 lg:min-w-32 lg:items-end">
      <div className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
        {vote.status === "draft" || vote.status === "scheduled" ? (
          <OpenVoteAction
            disabled={state.isPending}
            isOpening={state.isOpening}
            onOpen={state.openVote}
            vote={vote}
          />
        ) : null}

        {vote.status === "draft" ? (
          <DeleteDraftVoteAction
            disabled={state.isPending}
            isDeleting={state.isDeleting}
            onDelete={state.deleteDraftVote}
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
            Завершено
          </span>
        ) : null}
      </div>

      {state.errorMessage ? (
        <p className="max-w-72 text-left text-xs font-medium text-destructive lg:text-right">
          {state.errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function DeleteDraftVoteAction({
  disabled,
  isDeleting,
  onDelete,
  vote,
}: {
  disabled: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  vote: AudienceVote;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={disabled}
          size="sm"
          variant="outline"
        >
          {isDeleting ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" data-icon="inline-start" />
          )}
          Видалити
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити чернетку?</AlertDialogTitle>
          <AlertDialogDescription>
            {vote.title} буде приховано з дашборда. Це м’яке видалення:
            голосування не видаляється з бази даних.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            Видалити чернетку
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
          Відкрити
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Відкрити голосування?</AlertDialogTitle>
          <AlertDialogDescription>
            {vote.title} стане поточним етапом голосування в Mini App. Сервер
            перевірить кандидатів, медіа та правило одного відкритого
            голосування.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction onClick={onOpen}>
            <Play aria-hidden="true" data-icon="inline-start" />
            Відкрити голосування
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
          Закрити
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Закрити голосування?</AlertDialogTitle>
          <AlertDialogDescription>
            {vote.title} буде завершено. Після закриття його не можна буде
            відкрити повторно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={onClose}
          >
            <Lock aria-hidden="true" data-icon="inline-start" />
            Закрити голосування
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
