"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  voteCandidateMediaIdSchema,
  type AudienceVote,
  type VoteCandidate,
  type VoteCandidateMedia,
  type VoteCandidateMediaId,
} from "@/entities/audience-vote";
import {
  deleteVoteCandidateMedia,
  fetchVoteCandidateMedia,
  uploadVoteCandidateMedia,
  type VoteCandidateMediaApiError,
} from "../api/vote-candidate-media-client";
import { resolveVoteCandidateMediaFile } from "./vote-candidate-media";

export const addNewMediaSelectValue = "__new_media__";

export const audienceVoteCandidateMediaQueryKey = ({
  candidateId,
  voteId,
}: {
  candidateId: VoteCandidate["id"];
  voteId: AudienceVote["id"];
}) => ["audienceVotes", voteId, "candidates", candidateId, "media"] as const;

export function useVoteCandidateMedia({
  candidate,
  vote,
}: {
  candidate: VoteCandidate;
  vote: AudienceVote;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replaceMediaId, setReplaceMediaId] =
    useState<VoteCandidateMediaId | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const isClosed = vote.status === "closed";
  const canSoftDelete = vote.status === "draft" || vote.status === "scheduled";

  const mediaQuery = useQuery<VoteCandidateMedia[], VoteCandidateMediaApiError>({
    queryFn: () =>
      fetchVoteCandidateMedia({ candidateId: candidate.id, voteId: vote.id }),
    queryKey: audienceVoteCandidateMediaQueryKey({
      candidateId: candidate.id,
      voteId: vote.id,
    }),
  });

  const activeMedia = useMemo(
    () => (mediaQuery.data ?? []).filter((media) => !media.archived),
    [mediaQuery.data]
  );
  const archivedMedia = useMemo(
    () => (mediaQuery.data ?? []).filter((media) => media.archived),
    [mediaQuery.data]
  );

  const uploadMutation = useMutation<
    VoteCandidateMedia,
    VoteCandidateMediaApiError,
    { file: File; replacesMediaId: VoteCandidateMediaId | null }
  >({
    mutationFn: ({ file: selectedFile, replacesMediaId }) =>
      uploadVoteCandidateMedia({
        candidateId: candidate.id,
        file: selectedFile,
        onUploadProgress: (progress) => {
          setUploadProgress(progress.percentage);
        },
        replacesMediaId,
        voteId: vote.id,
      }),
    onError: (error) => {
      setFormError(error.message);
      setSuccessMessage(null);
    },
    onSuccess: async (uploadedMedia, variables) => {
      const queryKey = audienceVoteCandidateMediaQueryKey({
        candidateId: candidate.id,
        voteId: vote.id,
      });
      queryClient.setQueryData<VoteCandidateMedia[]>(queryKey, (current) =>
        mergeUploadedMedia({
          media: current,
          replacesMediaId: variables.replacesMediaId,
          uploadedMedia,
        })
      );
      await queryClient.invalidateQueries({ queryKey });
      resetFileInput();
      setFormError(null);
      setSuccessMessage("Media uploaded.");
      setReplaceMediaId(null);
      setUploadProgress(null);
    },
  });

  const deleteMutation = useMutation<
    { id: VoteCandidateMediaId },
    VoteCandidateMediaApiError,
    VoteCandidateMediaId
  >({
    mutationFn: (mediaId) =>
      deleteVoteCandidateMedia({
        candidateId: candidate.id,
        mediaId,
        voteId: vote.id,
      }),
    onError: (error) => {
      setFormError(error.message);
      setSuccessMessage(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteCandidateMediaQueryKey({
          candidateId: candidate.id,
          voteId: vote.id,
        }),
      });
      setFormError(null);
      setSuccessMessage("Media archived.");
    },
  });

  function selectFile(selectedFile: File | null) {
    setUploadProgress(null);
    setSuccessMessage(null);

    if (!selectedFile) {
      resetFileInput();
      return;
    }

    const resolvedFile = resolveVoteCandidateMediaFile(selectedFile);
    if (!resolvedFile.ok) {
      resetFileInput();
      setFormError(resolvedFile.message);
      return;
    }

    setFile(selectedFile);
    setFormError(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleReplaceMediaChange(value: string) {
    if (value === addNewMediaSelectValue) {
      setReplaceMediaId(null);
      return;
    }

    const parsedMediaId = voteCandidateMediaIdSchema.safeParse(value);
    if (parsedMediaId.success) {
      setReplaceMediaId(parsedMediaId.data);
    }
  }

  function uploadSelectedFile() {
    if (!file || isClosed || uploadMutation.isPending) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    uploadMutation.mutate({ file, replacesMediaId: replaceMediaId });
  }

  function softDeleteMedia(media: VoteCandidateMedia) {
    if (!canSoftDelete || deleteMutation.isPending) {
      return;
    }

    deleteMutation.mutate(media.id);
  }

  function resetFileInput() {
    setFile(null);
    setFileInputKey((current) => current + 1);
  }

  const replaceMediaSelectValue:
    | VoteCandidateMediaId
    | typeof addNewMediaSelectValue = replaceMediaId ?? addNewMediaSelectValue;

  return {
    activeMedia,
    archivedMedia,
    canSoftDelete,
    file,
    fileInputKey,
    formError,
    handleFileChange,
    handleReplaceMediaChange,
    isClosed,
    isDeleting: deleteMutation.isPending,
    isLoading: mediaQuery.isLoading,
    isQueryError: mediaQuery.isError,
    isUploading: uploadMutation.isPending,
    queryError: mediaQuery.error,
    replaceMediaId,
    replaceMediaSelectValue,
    resetFileInput,
    selectFile,
    setShowArchived,
    showArchived,
    softDeleteMedia,
    successMessage,
    uploadProgress,
    uploadSelectedFile,
  };
}

function mergeUploadedMedia({
  media,
  replacesMediaId,
  uploadedMedia,
}: {
  media: VoteCandidateMedia[] | undefined;
  replacesMediaId: VoteCandidateMediaId | null;
  uploadedMedia: VoteCandidateMedia;
}): VoteCandidateMedia[] {
  const currentMedia = media ?? [];
  const mergedMedia = currentMedia
    .filter((item) => item.id !== uploadedMedia.id)
    .map((item) =>
      replacesMediaId && item.id === replacesMediaId
        ? { ...item, archived: true }
        : item
    );

  return [...mergedMedia, uploadedMedia].sort(
    (first, second) =>
      Number(first.archived) - Number(second.archived) ||
      first.display_order - second.display_order ||
      first.created_at.getTime() - second.created_at.getTime()
  );
}
