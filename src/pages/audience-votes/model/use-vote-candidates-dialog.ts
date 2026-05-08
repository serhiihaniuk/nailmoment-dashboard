"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AudienceVote,
  VoteCandidate,
  VoteCandidateId,
} from "@/entities/audience-vote";
import type { PatchVoteCandidateClientInput } from "@/shared/db/schema.zod";
import {
  createVoteCandidate,
  deleteVoteCandidate,
  fetchVoteCandidates,
  updateVoteCandidate,
  type VoteCandidateApiError,
} from "../api/vote-candidates-client";
import {
  createVoteCandidateDefaultDraft,
  createVoteCandidateDraftFromValues,
  mapVoteCandidateApiErrors,
  parseVoteCandidateDraft,
  type VoteCandidateDraft,
  type VoteCandidateFieldErrors,
  type VoteCandidateFormValues,
} from "./vote-candidate-form";

export const audienceVoteCandidatesQueryKey = (voteId: AudienceVote["id"]) =>
  ["audienceVotes", voteId, "candidates"] as const;

export function useVoteCandidatesDialog(vote: AudienceVote) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VoteCandidateDraft>(
    createVoteCandidateDefaultDraft
  );
  const [errors, setErrors] = useState<VoteCandidateFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] =
    useState<VoteCandidateId | null>(null);
  const [editDraft, setEditDraft] = useState<VoteCandidateDraft>(
    createVoteCandidateDefaultDraft
  );
  const [editErrors, setEditErrors] = useState<VoteCandidateFieldErrors>({});
  const isLocked = vote.status === "open" || vote.status === "closed";

  const candidatesQuery = useQuery<VoteCandidate[], VoteCandidateApiError>({
    enabled: open,
    queryFn: () => fetchVoteCandidates(vote.id),
    queryKey: audienceVoteCandidatesQueryKey(vote.id),
  });

  const createMutation = useMutation<
    VoteCandidate,
    VoteCandidateApiError,
    VoteCandidateFormValues
  >({
    mutationFn: (body) => createVoteCandidate({ body, voteId: vote.id }),
    onError: (error) => {
      const fieldErrors = mapVoteCandidateApiErrors(error);
      setErrors(fieldErrors);

      if (Object.keys(fieldErrors).length === 0) {
        setFormError(error.message);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteCandidatesQueryKey(vote.id),
      });
      setDraft(createVoteCandidateDefaultDraft());
      setErrors({});
      setFormError(null);
    },
  });

  const updateMutation = useMutation<
    VoteCandidate,
    VoteCandidateApiError,
    {
      body: PatchVoteCandidateClientInput;
      candidateId: VoteCandidateId;
    }
  >({
    mutationFn: ({ body, candidateId }) =>
      updateVoteCandidate({ body, candidateId, voteId: vote.id }),
    onError: (error, variables) => {
      const fieldErrors = mapVoteCandidateApiErrors(error);

      if ("display_order" in variables.body) {
        setFormError(error.message);
        return;
      }

      setEditErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) {
        setFormError(error.message);
      }
    },
    onSuccess: async (_candidate, variables) => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteCandidatesQueryKey(vote.id),
      });

      if (!("display_order" in variables.body)) {
        cancelEditing();
      }

      setFormError(null);
    },
  });

  const deleteMutation = useMutation<
    { id: VoteCandidateId },
    VoteCandidateApiError,
    VoteCandidateId
  >({
    mutationFn: (candidateId) => deleteVoteCandidate({ candidateId, voteId: vote.id }),
    onError: (error) => {
      setFormError(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteCandidatesQueryKey(vote.id),
      });
      setFormError(null);
    },
  });

  function resetDialogState() {
    setDraft(createVoteCandidateDefaultDraft());
    setErrors({});
    setFormError(null);
    cancelEditing();
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    resetDialogState();
  }

  function updateDraft<Field extends keyof VoteCandidateDraft>(
    field: Field,
    value: VoteCandidateDraft[Field]
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function updateEditDraft<Field extends keyof VoteCandidateDraft>(
    field: Field,
    value: VoteCandidateDraft[Field]
  ) {
    setEditDraft((current) => ({ ...current, [field]: value }));
    setEditErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const parsed = parseVoteCandidateDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    createMutation.mutate(parsed.data);
  }

  function startEditing(candidate: VoteCandidate) {
    setEditingCandidateId(candidate.id);
    setEditDraft(createVoteCandidateDraftFromValues(candidate));
    setEditErrors({});
    setFormError(null);
  }

  function cancelEditing() {
    setEditingCandidateId(null);
    setEditDraft(createVoteCandidateDefaultDraft());
    setEditErrors({});
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditErrors({});
    setFormError(null);

    if (!editingCandidateId) {
      return;
    }

    const parsed = parseVoteCandidateDraft(editDraft);
    if (!parsed.ok) {
      setEditErrors(parsed.errors);
      return;
    }

    updateMutation.mutate({
      body: parsed.data,
      candidateId: editingCandidateId,
    });
  }

  function moveCandidate(candidate: VoteCandidate, displayOrder: number) {
    updateMutation.mutate({
      body: { display_order: displayOrder },
      candidateId: candidate.id,
    });
  }

  function deleteCandidate(candidate: VoteCandidate) {
    deleteMutation.mutate(candidate.id);
  }

  const pendingCandidateId =
    updateMutation.variables?.candidateId ?? deleteMutation.variables ?? null;

  return {
    cancelEditing,
    candidates: candidatesQuery.data ?? [],
    deleteCandidate,
    draft,
    editDraft,
    editErrors,
    editingCandidateId,
    errors,
    formError,
    handleCreateSubmit,
    handleEditSubmit,
    handleOpenChange,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isEditing: updateMutation.isPending,
    isLocked,
    isLoading: candidatesQuery.isLoading,
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    isQueryError: candidatesQuery.isError,
    moveCandidate,
    open,
    pendingCandidateId,
    queryError: candidatesQuery.error,
    startEditing,
    updateDraft,
    updateEditDraft,
  };
}
