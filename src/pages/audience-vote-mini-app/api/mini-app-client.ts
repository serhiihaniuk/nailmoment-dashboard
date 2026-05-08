import {
  parseAudienceVoteMiniAppResponse,
  type AudienceVoteMiniAppResponse,
} from "@/entities/audience-vote";

export async function fetchAudienceVoteMiniAppFeed(
  initData: string
): Promise<AudienceVoteMiniAppResponse> {
  const response = await fetch("/api/audience-vote/mini-app", {
    cache: "no-store",
    headers: {
      "x-telegram-init-data": initData,
    },
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseMiniAppApiErrorMessage(json));
  }

  return parseAudienceVoteMiniAppResponse(json);
}

function parseMiniAppApiErrorMessage(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return "Не вдалося завантажити голосування.";
}
