import { upload, type UploadOptions } from "@vercel/blob/client";
import { nanoid } from "nanoid";

import {
  buildVoteCandidateMediaPath,
  parseVoteCandidateMedia,
  parseVoteCandidateMediaList,
  voteCandidateMediaUploadPayloadSchema,
  type AudienceVoteId,
  type VoteCandidateId,
  type VoteCandidateMedia,
  type VoteCandidateMediaId,
} from "@/entities/audience-vote";
import {
  parseVoteCandidateMediaApiError,
  resolveVoteCandidateMediaFile,
  type VoteCandidateMediaApiError,
} from "../model/vote-candidate-media";

function voteCandidateMediaUrl(
  voteId: AudienceVoteId,
  candidateId: VoteCandidateId
) {
  return `/api/audience-vote/${encodeURIComponent(
    voteId
  )}/candidates/${encodeURIComponent(candidateId)}/media`;
}

function singleVoteCandidateMediaUrl({
  candidateId,
  mediaId,
  voteId,
}: {
  candidateId: VoteCandidateId;
  mediaId: VoteCandidateMediaId;
  voteId: AudienceVoteId;
}) {
  return `${voteCandidateMediaUrl(voteId, candidateId)}/${encodeURIComponent(
    mediaId
  )}`;
}

function voteCandidateMediaUploadUrl(
  voteId: AudienceVoteId,
  candidateId: VoteCandidateId
) {
  return `${voteCandidateMediaUrl(voteId, candidateId)}/upload`;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function fetchVoteCandidateMedia({
  candidateId,
  voteId,
}: {
  candidateId: VoteCandidateId;
  voteId: AudienceVoteId;
}): Promise<VoteCandidateMedia[]> {
  const response = await fetch(voteCandidateMediaUrl(voteId, candidateId));
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateMediaApiError(json);
  }

  return parseVoteCandidateMediaList(json);
}

export async function uploadVoteCandidateMedia({
  candidateId,
  file,
  onUploadProgress,
  replacesMediaId,
  voteId,
}: {
  candidateId: VoteCandidateId;
  file: File;
  onUploadProgress?: UploadOptions["onUploadProgress"];
  replacesMediaId?: VoteCandidateMediaId | null;
  voteId: AudienceVoteId;
}): Promise<VoteCandidateMedia> {
  const resolvedFile = resolveVoteCandidateMediaFile(file);
  if (!resolvedFile.ok) {
    throw { message: resolvedFile.message } satisfies VoteCandidateMediaApiError;
  }

  const payload = voteCandidateMediaUploadPayloadSchema.parse({
    audienceVoteId: voteId,
    candidateId,
    contentType: resolvedFile.contentType,
    fileName: file.name,
    mediaId: nanoid(12),
    replacesMediaId: replacesMediaId ?? null,
    sizeBytes: file.size,
  });
  const pathname = buildVoteCandidateMediaPath(payload);
  const uploadOptions: UploadOptions = {
    access: "public",
    clientPayload: JSON.stringify(payload),
    contentType: payload.contentType,
    handleUploadUrl: voteCandidateMediaUploadUrl(voteId, candidateId),
    multipart: file.size > 20 * 1024 * 1024,
  };

  if (onUploadProgress) {
    uploadOptions.onUploadProgress = onUploadProgress;
  }

  const blob = await upload(pathname, file, uploadOptions);
  const response = await fetch(voteCandidateMediaUploadUrl(voteId, candidateId), {
    body: JSON.stringify({
      payload: {
        blob,
        clientPayload: uploadOptions.clientPayload,
      },
      type: "app.confirm-client-upload",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateMediaApiError(json);
  }

  return parseVoteCandidateMedia(json);
}

export async function deleteVoteCandidateMedia({
  candidateId,
  mediaId,
  voteId,
}: {
  candidateId: VoteCandidateId;
  mediaId: VoteCandidateMediaId;
  voteId: AudienceVoteId;
}): Promise<{ id: VoteCandidateMediaId }> {
  const response = await fetch(
    singleVoteCandidateMediaUrl({ candidateId, mediaId, voteId }),
    { method: "DELETE" }
  );
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateMediaApiError(json);
  }

  return { id: mediaId };
}

export async function updateVoteCandidateMedia({
  candidateId,
  displayOrder,
  mediaId,
  voteId,
}: {
  candidateId: VoteCandidateId;
  displayOrder: number;
  mediaId: VoteCandidateMediaId;
  voteId: AudienceVoteId;
}): Promise<VoteCandidateMedia> {
  const response = await fetch(
    singleVoteCandidateMediaUrl({ candidateId, mediaId, voteId }),
    {
      body: JSON.stringify({ display_order: displayOrder }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }
  );
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateMediaApiError(json);
  }

  return parseVoteCandidateMedia(json);
}

export async function restoreVoteCandidateMedia({
  candidateId,
  mediaId,
  voteId,
}: {
  candidateId: VoteCandidateId;
  mediaId: VoteCandidateMediaId;
  voteId: AudienceVoteId;
}): Promise<VoteCandidateMedia> {
  const response = await fetch(
    singleVoteCandidateMediaUrl({ candidateId, mediaId, voteId }),
    {
      body: JSON.stringify({ archived: false }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }
  );
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateMediaApiError(json);
  }

  return parseVoteCandidateMedia(json);
}

export type { VoteCandidateMediaApiError };
