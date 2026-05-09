import {
  parseVoteCandidate,
  parseVoteCandidateList,
  type AudienceVoteId,
  type VoteCandidate,
  type VoteCandidateId,
} from "@/entities/audience-vote";
import {
  parseVoteCandidateApiError,
  type VoteCandidateApiError,
  type VoteCandidateFormValues,
} from "../model/vote-candidate-form";
import type { PatchVoteCandidateClientInput } from "@/shared/db/schema.zod";

function voteCandidateUrl(voteId: AudienceVoteId) {
  return `/api/audience-vote/${encodeURIComponent(voteId)}/candidates`;
}

function singleVoteCandidateUrl(
  voteId: AudienceVoteId,
  candidateId: VoteCandidateId
) {
  return `${voteCandidateUrl(voteId)}/${encodeURIComponent(candidateId)}`;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function fetchVoteCandidates(
  voteId: AudienceVoteId
): Promise<VoteCandidate[]> {
  const response = await fetch(voteCandidateUrl(voteId));
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateApiError(json);
  }

  return parseVoteCandidateList(json);
}

export async function createVoteCandidate({
  body,
  voteId,
}: {
  body: VoteCandidateFormValues;
  voteId: AudienceVoteId;
}): Promise<VoteCandidate> {
  const response = await fetch(voteCandidateUrl(voteId), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateApiError(json);
  }

  return parseVoteCandidate(json);
}

export async function updateVoteCandidate({
  body,
  candidateId,
  voteId,
}: {
  body: PatchVoteCandidateClientInput;
  candidateId: VoteCandidateId;
  voteId: AudienceVoteId;
}): Promise<VoteCandidate> {
  const response = await fetch(singleVoteCandidateUrl(voteId, candidateId), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateApiError(json);
  }

  return parseVoteCandidate(json);
}

export async function deleteVoteCandidate({
  candidateId,
  voteId,
}: {
  candidateId: VoteCandidateId;
  voteId: AudienceVoteId;
}): Promise<{ id: VoteCandidateId }> {
  const response = await fetch(singleVoteCandidateUrl(voteId, candidateId), {
    method: "DELETE",
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw parseVoteCandidateApiError(json);
  }

  return { id: candidateId };
}

export type { VoteCandidateApiError };
