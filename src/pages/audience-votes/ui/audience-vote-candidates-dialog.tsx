"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

import type { AudienceVote, VoteCandidate } from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Textarea } from "@/shared/ui/textarea";
import {
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
} from "../model/audience-vote-form";
import { useVoteCandidatesDialog } from "../model/use-vote-candidates-dialog";
import type {
  VoteCandidateDraft,
  VoteCandidateFieldErrors,
} from "../model/vote-candidate-form";

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
          <Users aria-hidden="true" size={14} />
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
          <form
            className="grid gap-3 rounded-lg border border-border/70 p-3"
            onSubmit={state.handleCreateSubmit}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Add candidate</h3>
              <Button disabled={state.isPending} size="sm" type="submit">
                {state.isCreating ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Plus aria-hidden="true" size={14} />
                )}
                Add
              </Button>
            </div>
            <CandidateFields
              disabled={state.isPending}
              draft={state.draft}
              errors={state.errors}
              onChange={state.updateDraft}
            />
          </form>
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
          <CandidateTable
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
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CandidateTable({
  candidates,
  editDraft,
  editErrors,
  editingCandidateId,
  isLocked,
  isPending,
  onCancelEdit,
  onDelete,
  onEditSubmit,
  onMove,
  onStartEdit,
  onUpdateEditDraft,
  pendingCandidateId,
}: {
  candidates: VoteCandidate[];
  editDraft: VoteCandidateDraft;
  editErrors: VoteCandidateFieldErrors;
  editingCandidateId: VoteCandidate["id"] | null;
  isLocked: boolean;
  isPending: boolean;
  onCancelEdit: () => void;
  onDelete: (candidate: VoteCandidate) => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMove: (candidate: VoteCandidate, displayOrder: number) => void;
  onStartEdit: (candidate: VoteCandidate) => void;
  onUpdateEditDraft: <Field extends keyof VoteCandidateDraft>(
    field: Field,
    value: VoteCandidateDraft[Field]
  ) => void;
  pendingCandidateId: VoteCandidate["id"] | null;
}) {
  const [candidateToDelete, setCandidateToDelete] =
    useState<VoteCandidate | null>(null);

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
        No Vote Candidates yet.
      </div>
    );
  }

  return (
    <>
      {candidateToDelete ? (
        <div
          aria-live="polite"
          className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
          role="alertdialog"
        >
          <div>
            <h4 className="text-sm font-semibold text-destructive">
              Soft-delete candidate?
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {candidateToDelete.display_name} will be hidden from active
              candidate lists.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              disabled={isPending}
              onClick={() => setCandidateToDelete(null)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={() => {
                onDelete(candidateToDelete);
                setCandidateToDelete(null);
              }}
              size="sm"
              type="button"
              variant="destructive"
            >
              Soft-delete
            </Button>
          </div>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border/60 **:data-[slot=table-container]:rounded-none **:data-[slot=table-container]:border-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Public display</TableHead>
              <TableHead>Internal</TableHead>
              <TableHead>Caption</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate, index) => {
              const isEditing = editingCandidateId === candidate.id;
              const isRowPending = pendingCandidateId === candidate.id;

              return (
                <TableRow key={candidate.id}>
                  <TableCell className="align-top">
                    <Badge className="rounded-md" variant="outline">
                      {candidate.display_order}
                    </Badge>
                  </TableCell>
                  {isEditing ? (
                    <TableCell colSpan={3}>
                      <form className="grid gap-3" onSubmit={onEditSubmit}>
                        <CandidateFields
                          disabled={isPending}
                          draft={editDraft}
                          errors={editErrors}
                          onChange={onUpdateEditDraft}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={isPending}
                            onClick={onCancelEdit}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <X aria-hidden="true" size={14} />
                            Cancel
                          </Button>
                          <Button disabled={isPending} size="sm" type="submit">
                            {isRowPending ? (
                              <Loader2
                                aria-hidden="true"
                                className="animate-spin"
                              />
                            ) : (
                              <Save aria-hidden="true" size={14} />
                            )}
                            Save
                          </Button>
                        </div>
                      </form>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="align-top">
                        <div className="font-medium">
                          {candidate.display_name}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {candidate.internal_name ?? "None"}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {candidate.caption ?? "None"}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-1">
                      <IconButton
                        disabled={
                          isEditing || isLocked || isPending || index === 0
                        }
                        label="Move candidate up"
                        onClick={() =>
                          onMove(candidate, candidate.display_order - 1)
                        }
                      >
                        <ArrowUp aria-hidden="true" size={14} />
                      </IconButton>
                      <IconButton
                        disabled={
                          isEditing ||
                          isLocked ||
                          isPending ||
                          index === candidates.length - 1
                        }
                        label="Move candidate down"
                        onClick={() =>
                          onMove(candidate, candidate.display_order + 1)
                        }
                      >
                        <ArrowDown aria-hidden="true" size={14} />
                      </IconButton>
                      <IconButton
                        disabled={isEditing || isLocked || isPending}
                        label="Edit candidate"
                        onClick={() => onStartEdit(candidate)}
                      >
                        <Pencil aria-hidden="true" size={14} />
                      </IconButton>
                      <IconButton
                        disabled={isEditing || isLocked || isPending}
                        label="Soft-delete candidate"
                        onClick={() => setCandidateToDelete(candidate)}
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function CandidateFields({
  disabled,
  draft,
  errors,
  onChange,
}: {
  disabled: boolean;
  draft: VoteCandidateDraft;
  errors: VoteCandidateFieldErrors;
  onChange: <Field extends keyof VoteCandidateDraft>(
    field: Field,
    value: VoteCandidateDraft[Field]
  ) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Public display name" message={errors.display_name}>
        <Input
          disabled={disabled}
          onChange={(event) => onChange("display_name", event.target.value)}
          placeholder="Anonymous finalist 1"
          value={draft.display_name}
        />
      </Field>
      <Field label="Internal name" message={errors.internal_name}>
        <Input
          disabled={disabled}
          onChange={(event) => onChange("internal_name", event.target.value)}
          placeholder="Operator note or real name"
          value={draft.internal_name}
        />
      </Field>
      <Field
        className="sm:col-span-2"
        label="Public caption"
        message={errors.caption}
      >
        <Textarea
          disabled={disabled}
          maxRows={4}
          onChange={(event) => onChange("caption", event.target.value)}
          placeholder="Shown in the Mini App"
          value={draft.caption}
        />
      </Field>
    </div>
  );
}

function Field({
  children,
  className,
  label,
  message,
}: {
  children: ReactNode;
  className?: string | undefined;
  label: string;
  message?: string | undefined;
}) {
  return (
    <div className={className ? `grid gap-2 ${className}` : "grid gap-2"}>
      <Label>{label}</Label>
      {children}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
