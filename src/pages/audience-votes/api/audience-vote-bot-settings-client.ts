import {
  parseAudienceVoteBotSettings,
  type AudienceVoteBotSettings,
} from "@/entities/audience-vote";
import {
  parseAudienceVoteBotSettingsApiError,
  type AudienceVoteBotSettingsApiError,
  type AudienceVoteBotSettingsFormValues,
} from "../model/audience-vote-bot-settings";

export async function fetchAudienceVoteBotSettings(): Promise<AudienceVoteBotSettings> {
  const response = await fetch("/api/audience-vote/bot-settings");
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteBotSettingsApiError(json);
  }

  return parseAudienceVoteBotSettings(json);
}

export async function updateAudienceVoteBotSettings(
  body: AudienceVoteBotSettingsFormValues
): Promise<AudienceVoteBotSettings> {
  const response = await fetch("/api/audience-vote/bot-settings", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAudienceVoteBotSettingsApiError(json);
  }

  return parseAudienceVoteBotSettings(json);
}

export type { AudienceVoteBotSettingsApiError };
