"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";

import type { VoteCandidate } from "@/entities/audience-vote";
import { VoteCandidateIconButton } from "./vote-candidate-icon-button";

export function VoteCandidateRowActions({
  candidate,
  candidatesCount,
  index,
  isEditing,
  isLocked,
  isPending,
  onMove,
  onRequestDelete,
  onStartEdit,
}: {
  candidate: VoteCandidate;
  candidatesCount: number;
  index: number;
  isEditing: boolean;
  isLocked: boolean;
  isPending: boolean;
  onMove: (candidate: VoteCandidate, displayOrder: number) => void;
  onRequestDelete: (candidate: VoteCandidate) => void;
  onStartEdit: (candidate: VoteCandidate) => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <VoteCandidateIconButton
        disabled={isEditing || isLocked || isPending || index === 0}
        label="Move candidate up"
        onClick={() => onMove(candidate, candidate.display_order - 1)}
      >
        <ArrowUp aria-hidden="true" />
      </VoteCandidateIconButton>
      <VoteCandidateIconButton
        disabled={
          isEditing || isLocked || isPending || index === candidatesCount - 1
        }
        label="Move candidate down"
        onClick={() => onMove(candidate, candidate.display_order + 1)}
      >
        <ArrowDown aria-hidden="true" />
      </VoteCandidateIconButton>
      <VoteCandidateIconButton
        disabled={isEditing || isLocked || isPending}
        label="Edit candidate"
        onClick={() => onStartEdit(candidate)}
      >
        <Pencil aria-hidden="true" />
      </VoteCandidateIconButton>
      <VoteCandidateIconButton
        disabled={isEditing || isLocked || isPending}
        label="Soft-delete candidate"
        onClick={() => onRequestDelete(candidate)}
      >
        <Trash2 aria-hidden="true" />
      </VoteCandidateIconButton>
    </div>
  );
}
