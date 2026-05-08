import {
  parseAudienceVoteBroadcast,
  parseAudienceVoteBroadcastList,
  parseAudienceVoteBroadcastPreview,
  type AudienceVoteBroadcast,
  type AudienceVoteBroadcastId,
  type AudienceVoteBroadcastPreview,
} from "@/entities/audience-vote";
import {
  parseAudienceVoteBroadcastApiError,
  type AudienceVoteBroadcastApiError,
  type CreateAudienceVoteBroadcastFormValues,
} from "../model/audience-vote-broadcast";

export async function fetchAudienceVoteBroadcasts(): Promise<
  AudienceVoteBroadcast[]
> {
  const response = await fetch("/api/audience-vote/broadcasts");

  if (!response.ok) {
    throw new Error("Could not load Audience Vote Broadcasts.");
  }

  return parseAudienceVoteBroadcastList(await response.json());
}

export async function previewAudienceVoteBroadcast(
  body: CreateAudienceVoteBroadcastFormValues
): Promise<AudienceVoteBroadcastPreview> {
  const response = await fetch("/api/audience-vote/broadcasts/preview", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteBroadcastApiError(json);
  }

  return parseAudienceVoteBroadcastPreview(json);
}

export async function createAudienceVoteBroadcast(
  body: CreateAudienceVoteBroadcastFormValues
): Promise<AudienceVoteBroadcast> {
  const response = await fetch("/api/audience-vote/broadcasts", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteBroadcastApiError(json);
  }

  return parseAudienceVoteBroadcast(json);
}

export async function interruptAudienceVoteBroadcast(
  broadcastId: AudienceVoteBroadcastId
): Promise<AudienceVoteBroadcast> {
  return postBroadcastAction(broadcastId, "interrupt");
}

export async function processAudienceVoteBroadcastCanary(
  broadcastId: AudienceVoteBroadcastId
): Promise<AudienceVoteBroadcast> {
  return postBroadcastAction(broadcastId, "process-canary");
}

async function postBroadcastAction(
  broadcastId: AudienceVoteBroadcastId,
  action: "interrupt" | "process-canary"
): Promise<AudienceVoteBroadcast> {
  const response = await fetch(
    `/api/audience-vote/broadcasts/${encodeURIComponent(broadcastId)}/${action}`,
    { method: "POST" }
  );
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteBroadcastApiError(json);
  }

  return parseAudienceVoteBroadcast(json);
}

export type { AudienceVoteBroadcastApiError };
