import {
  parseAudienceVote,
  parseAudienceVoteList,
  parseAudienceVoteResults,
  type AudienceVote,
  audienceVoteIdSchema,
  type AudienceVoteId,
  type AudienceVoteResults,
} from "@/entities/audience-vote";
import {
  parseCreateAudienceVoteApiError,
  type CreateAudienceVoteApiError,
  type CreateAudienceVoteFormValues,
} from "../model/audience-vote-form";
import {
  parseAudienceVoteScheduleApiError,
  type AudienceVoteScheduleApiError,
  type AudienceVoteScheduleFormValues,
} from "../model/audience-vote-schedule";
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
    throw new Error("Не вдалося завантажити результати голосування.");
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

export async function updateAudienceVoteSchedule(
  voteId: AudienceVoteId,
  body: AudienceVoteScheduleFormValues
): Promise<AudienceVote> {
  const response = await fetch(
    `/api/audience-vote/${encodeURIComponent(voteId)}`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }
  );

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteScheduleApiError(json);
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

export async function deleteDraftAudienceVote(
  voteId: AudienceVoteId
): Promise<AudienceVoteId> {
  const response = await fetch(
    `/api/audience-vote/${encodeURIComponent(voteId)}`,
    { method: "DELETE" }
  );
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteLifecycleApiError(json);
  }

  const deletedId =
    typeof json === "object" && json !== null && "id" in json
      ? json.id
      : undefined;

  return audienceVoteIdSchema.parse(deletedId);
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

export type {
  AudienceVoteLifecycleApiError,
  AudienceVoteScheduleApiError,
  CreateAudienceVoteApiError,
};

