"use client";

import type { VoteCandidate } from "@/entities/audience-vote";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

export function VoteCandidateDeleteDialog({
  candidate,
  disabled,
  onConfirm,
  onOpenChange,
}: {
  candidate: VoteCandidate | null;
  disabled: boolean;
  onConfirm: (candidate: VoteCandidate) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={Boolean(candidate)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Soft-delete candidate?</AlertDialogTitle>
          <AlertDialogDescription>
            {candidate
              ? `${candidate.display_name} will be hidden from active candidate lists.`
              : "This candidate will be hidden from active candidate lists."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled || !candidate}
            onClick={() => {
              if (candidate) onConfirm(candidate);
            }}
          >
            Soft-delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
