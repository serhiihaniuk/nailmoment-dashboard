"use client";

import type { FormEvent } from "react";
import { Images } from "lucide-react";

import type { VoteCandidate } from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { TableCell, TableRow } from "@/shared/ui/table";
import type {
  VoteCandidateDraft,
  VoteCandidateFieldErrors,
} from "../model/vote-candidate-form";
import { VoteCandidateEditForm } from "./vote-candidate-edit-form";
import { VoteCandidateIconButton } from "./vote-candidate-icon-button";
import { VoteCandidateRowActions } from "./vote-candidate-row-actions";

export function VoteCandidateRow({
  candidate,
  candidatesCount,
  editDraft,
  editErrors,
  index,
  isEditing,
  isLocked,
  isPending,
  isRowPending,
  onCancelEdit,
  onEditSubmit,
  onMove,
  onOpenMedia,
  onRequestDelete,
  onStartEdit,
  onUpdateEditDraft,
}: {
  candidate: VoteCandidate;
  candidatesCount: number;
  editDraft: VoteCandidateDraft;
  editErrors: VoteCandidateFieldErrors;
  index: number;
  isEditing: boolean;
  isLocked: boolean;
  isPending: boolean;
  isRowPending: boolean;
  onCancelEdit: () => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMove: (candidate: VoteCandidate, displayOrder: number) => void;
  onOpenMedia: (candidate: VoteCandidate) => void;
  onRequestDelete: (candidate: VoteCandidate) => void;
  onStartEdit: (candidate: VoteCandidate) => void;
  onUpdateEditDraft: <FieldName extends keyof VoteCandidateDraft>(
    field: FieldName,
    value: VoteCandidateDraft[FieldName]
  ) => void;
}) {
  return (
    <TableRow>
      <TableCell className="align-top">
        <Badge className="rounded-md" variant="outline">
          {candidate.display_order}
        </Badge>
      </TableCell>
      {isEditing ? (
        <TableCell colSpan={4}>
          <VoteCandidateEditForm
            draft={editDraft}
            errors={editErrors}
            isPending={isPending}
            isRowPending={isRowPending}
            onCancel={onCancelEdit}
            onSubmit={onEditSubmit}
            onUpdateDraft={onUpdateEditDraft}
          />
        </TableCell>
      ) : (
        <>
          <TableCell className="align-top">
            <div className="font-medium">{candidate.display_name}</div>
          </TableCell>
          <TableCell className="align-top text-muted-foreground">
            {candidate.internal_name ?? "None"}
          </TableCell>
          <TableCell className="align-top text-muted-foreground">
            {candidate.caption ?? "None"}
          </TableCell>
          <TableCell className="align-top">
            <div className="flex justify-end">
              <VoteCandidateIconButton
                disabled={isEditing || isPending}
                label="Manage candidate media"
                onClick={() => onOpenMedia(candidate)}
              >
                <Images aria-hidden="true" />
              </VoteCandidateIconButton>
            </div>
          </TableCell>
        </>
      )}
      <TableCell className="align-top">
        <VoteCandidateRowActions
          candidate={candidate}
          candidatesCount={candidatesCount}
          index={index}
          isEditing={isEditing}
          isLocked={isLocked}
          isPending={isPending}
          onMove={onMove}
          onRequestDelete={onRequestDelete}
          onStartEdit={onStartEdit}
        />
      </TableCell>
    </TableRow>
  );
}
