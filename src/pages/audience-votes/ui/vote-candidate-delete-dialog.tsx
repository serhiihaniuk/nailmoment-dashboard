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
          <AlertDialogTitle>Приховати кандидата?</AlertDialogTitle>
          <AlertDialogDescription>
            {candidate
              ? `${candidate.display_name} буде приховано зі списків активних кандидатів.`
              : "Цього кандидата буде приховано зі списків активних кандидатів."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled || !candidate}
            onClick={() => {
              if (candidate) onConfirm(candidate);
            }}
          >
            Приховати
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
