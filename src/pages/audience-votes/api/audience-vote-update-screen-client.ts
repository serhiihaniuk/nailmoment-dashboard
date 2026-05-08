import {
  parseAudienceVoteUpdateScreen,
  type AudienceVoteUpdateScreen,
} from "@/entities/audience-vote";
import {
  parseAudienceVoteUpdateScreenApiError,
  type AudienceVoteUpdateScreenApiError,
  type AudienceVoteUpdateScreenFormValues,
} from "../model/audience-vote-update-screen";

export async function fetchAudienceVoteUpdateScreen(): Promise<AudienceVoteUpdateScreen> {
  const response = await fetch("/api/audience-vote/update-screen");
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteUpdateScreenApiError(json);
  }

  return parseAudienceVoteUpdateScreen(json);
}

export async function updateAudienceVoteUpdateScreen(
  body: AudienceVoteUpdateScreenFormValues
): Promise<AudienceVoteUpdateScreen> {
  const response = await fetch("/api/audience-vote/update-screen", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteUpdateScreenApiError(json);
  }

  return parseAudienceVoteUpdateScreen(json);
}

export type { AudienceVoteUpdateScreenApiError };
