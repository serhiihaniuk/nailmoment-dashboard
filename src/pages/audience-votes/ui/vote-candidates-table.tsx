"use client";

import { type FormEvent, useState } from "react";

import type { AudienceVote, VoteCandidate } from "@/entities/audience-vote";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/ui/empty";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type {
  VoteCandidateDraft,
  VoteCandidateFieldErrors,
} from "../model/vote-candidate-form";
import { VoteCandidateDeleteDialog } from "./vote-candidate-delete-dialog";
import { VoteCandidateMediaPanel } from "./vote-candidate-media-panel";
import { VoteCandidateRow } from "./vote-candidate-row";

export function VoteCandidatesTable({
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
  vote,
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
  onUpdateEditDraft: <FieldName extends keyof VoteCandidateDraft>(
    field: FieldName,
    value: VoteCandidateDraft[FieldName]
  ) => void;
  pendingCandidateId: VoteCandidate["id"] | null;
  vote: AudienceVote;
}) {
  const [candidateToDelete, setCandidateToDelete] =
    useState<VoteCandidate | null>(null);
  const [mediaCandidate, setMediaCandidate] =
    useState<VoteCandidate | null>(null);

  if (candidates.length === 0) {
    return (
      <Empty className="border border-border/70">
        <EmptyHeader>
          <EmptyTitle>No Vote Candidates yet</EmptyTitle>
          <EmptyDescription>
            Add at least two active candidates before opening this Audience
            Vote.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mediaCandidate ? (
        <VoteCandidateMediaPanel
          candidate={mediaCandidate}
          onClose={() => setMediaCandidate(null)}
          vote={vote}
        />
      ) : null}
      <VoteCandidateDeleteDialog
        candidate={candidateToDelete}
        disabled={isPending}
        onConfirm={(candidate) => {
          onDelete(candidate);
          setCandidateToDelete(null);
        }}
        onOpenChange={(open) => {
          if (!open) setCandidateToDelete(null);
        }}
      />
      <div className="overflow-hidden rounded-lg border border-border/60 **:data-[slot=table-container]:rounded-none **:data-[slot=table-container]:border-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Public display</TableHead>
              <TableHead>Internal</TableHead>
              <TableHead>Caption</TableHead>
              <TableHead className="w-28 text-right">Media</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate, index) => (
              <VoteCandidateRow
                candidate={candidate}
                candidatesCount={candidates.length}
                editDraft={editDraft}
                editErrors={editErrors}
                index={index}
                isEditing={editingCandidateId === candidate.id}
                isLocked={isLocked}
                isPending={isPending}
                isRowPending={pendingCandidateId === candidate.id}
                key={candidate.id}
                onCancelEdit={onCancelEdit}
                onEditSubmit={onEditSubmit}
                onMove={onMove}
                onOpenMedia={setMediaCandidate}
                onRequestDelete={setCandidateToDelete}
                onStartEdit={onStartEdit}
                onUpdateEditDraft={onUpdateEditDraft}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
