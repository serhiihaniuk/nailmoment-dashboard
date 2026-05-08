"use client";

import { Loader2, Plus, Users } from "lucide-react";

import type { AudienceVote } from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { Badge } from "@/shared/ui/badge";
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
      <DialogContent className="max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw] sm:max-w-5xl lg:max-w-6xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-muted/30">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg">Vote Candidates</DialogTitle>
              <DialogDescription className="mt-1 sm:mt-1.5 flex items-center gap-1.5 sm:gap-2 flex-wrap text-[12px] sm:text-sm">
                <span className="font-medium text-foreground truncate">{vote.title}</span>
                <span className="text-border hidden sm:inline">·</span>
                <span className="hidden sm:inline">{formatAudienceVoteKind(vote.kind)}</span>
                <Badge 
                  variant={vote.status === "open" ? "default" : vote.status === "closed" ? "destructive" : "secondary"}
                  className="rounded-md text-[10px] px-1.5"
                >
                  {formatAudienceVoteStatus(vote.status)}
                </Badge>
              </DialogDescription>
            </div>
            {!state.isLocked && (
              <div className="text-right text-[11px] sm:text-[12px] text-muted-foreground shrink-0">
                <span className="font-medium text-foreground">{state.candidates.length}</span> <span className="hidden sm:inline">candidates</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Add candidate form */}
          {state.isLocked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
              Candidate management is locked for this vote status.
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-sm font-semibold">Add New Candidate</h4>
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
                  Add Candidate
                </Button>
              </div>
              <form
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
            </div>
          )}

          {/* Error display */}
          {state.formError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {state.formError}
            </div>
          ) : null}

          {state.isQueryError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Could not load candidates: {state.queryError?.message}
            </div>
          ) : null}

          {/* Candidates list */}
          {state.isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : null}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
