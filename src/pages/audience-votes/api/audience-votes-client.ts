import {
  parseAudienceVote,
  parseAudienceVoteList,
  parseAudienceVoteResults,
  type AudienceVote,
  type AudienceVoteId,
  type AudienceVoteResults,
} from "@/entities/audience-vote";
import {
  parseCreateAudienceVoteApiError,
  type CreateAudienceVoteApiError,
  type CreateAudienceVoteFormValues,
} from "../model/audience-vote-form";
import {
  parseAudienceVoteLifecycleApiError,
  type AudienceVoteLifecycleApiError,
} from "../model/audience-vote-lifecycle";

export async function fetchAudienceVotes(): Promise<AudienceVote[]> {
  const response = await fetch("/api/audience-vote");

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return parseAudienceVoteList(await response.json());
}

export async function fetchAudienceVoteResults(
  voteId: AudienceVoteId
): Promise<AudienceVoteResults> {
  const response = await fetch(
    `/api/audience-vote/${encodeURIComponent(voteId)}/results`
  );

  if (!response.ok) {
    throw new Error("Could not load Audience Vote results.");
  }

  return parseAudienceVoteResults(await response.json());
}

export async function createAudienceVote(
  body: CreateAudienceVoteFormValues
): Promise<AudienceVote> {
  const response = await fetch("/api/audience-vote", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseCreateAudienceVoteApiError(json);
  }

  return parseAudienceVote(json);
}

export async function openAudienceVote(
  voteId: AudienceVoteId
): Promise<AudienceVote> {
  return updateAudienceVoteLifecycle(voteId, "open");
}

export async function closeAudienceVote(
  voteId: AudienceVoteId
): Promise<AudienceVote> {
  return updateAudienceVoteLifecycle(voteId, "close");
}

async function updateAudienceVoteLifecycle(
  voteId: AudienceVoteId,
  action: "close" | "open"
): Promise<AudienceVote> {
  const response = await fetch(
    `/api/audience-vote/${encodeURIComponent(voteId)}/${action}`,
    { method: "POST" }
  );
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteLifecycleApiError(json);
  }

  return parseAudienceVote(json);
}

export type { AudienceVoteLifecycleApiError, CreateAudienceVoteApiError };

