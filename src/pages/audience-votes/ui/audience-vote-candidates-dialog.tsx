"use client";

import { Loader2, Plus, Users } from "lucide-react";

import type { AudienceVote } from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
} from "../model/audience-vote-form";
import { useVoteCandidatesDialog } from "../model/use-vote-candidates-dialog";
import { VoteCandidateFields } from "./vote-candidate-fields";
import { VoteCandidatesTable } from "./vote-candidates-table";

export function AudienceVoteCandidatesDialog({
  vote,
}: {
  vote: AudienceVote;
}) {
  const state = useVoteCandidatesDialog(vote);

  return (
    <Dialog open={state.open} onOpenChange={state.handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Users aria-hidden="true" data-icon="inline-start" />
          Candidates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vote Candidates</DialogTitle>
          <DialogDescription>
            {vote.title} / {formatAudienceVoteKind(vote.kind)} /{" "}
            {formatAudienceVoteStatus(vote.status)}
          </DialogDescription>
        </DialogHeader>

        {state.isLocked ? (
          <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Candidate management is locked for this status.
          </div>
        ) : (
          <Card className="gap-3 py-4 shadow-none">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Add candidate</CardTitle>
              <CardAction>
                <Button
                  disabled={state.isPending}
                  form="create-vote-candidate-form"
                  size="sm"
                  type="submit"
                >
                  {state.isCreating ? (
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <Plus aria-hidden="true" data-icon="inline-start" />
                  )}
                  Add
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-4">
              <form
                className="flex flex-col gap-3"
                id="create-vote-candidate-form"
                onSubmit={state.handleCreateSubmit}
              >
                <VoteCandidateFields
                  disabled={state.isPending}
                  draft={state.draft}
                  errors={state.errors}
                  onChange={state.updateDraft}
                />
              </form>
            </CardContent>
          </Card>
        )}

        {state.formError ? (
          <p className="text-sm font-medium text-destructive">
            {state.formError}
          </p>
        ) : null}

        {state.isQueryError ? (
          <p className="text-sm font-medium text-destructive">
            Could not load candidates: {state.queryError?.message}
          </p>
        ) : null}

        {state.isLoading ? <Skeleton className="h-56 w-full rounded-lg" /> : null}

        {!state.isLoading && !state.isQueryError ? (
          <VoteCandidatesTable
            candidates={state.candidates}
            editDraft={state.editDraft}
            editErrors={state.editErrors}
            editingCandidateId={state.editingCandidateId}
            isLocked={state.isLocked}
            isPending={state.isPending}
            onCancelEdit={state.cancelEditing}
            onDelete={state.deleteCandidate}
            onEditSubmit={state.handleEditSubmit}
            onMove={state.moveCandidate}
            onStartEdit={state.startEditing}
            onUpdateEditDraft={state.updateEditDraft}
            pendingCandidateId={state.pendingCandidateId}
            vote={vote}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
