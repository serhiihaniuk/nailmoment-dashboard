import {
  parseAudienceVote,
  parseAudienceVoteList,
  type AudienceVote,
} from "@/entities/audience-vote";
import {
  parseCreateAudienceVoteApiError,
  type CreateAudienceVoteApiError,
  type CreateAudienceVoteFormValues,
} from "../model/audience-vote-form";

export async function fetchAudienceVotes(): Promise<AudienceVote[]> {
  const response = await fetch("/api/audience-vote");

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return parseAudienceVoteList(await response.json());
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

export type { CreateAudienceVoteApiError };

