import {
  parseAudienceVoteMiniAppResponse,
  parseAudienceVoteMiniAppVoteResponse,
  type AudienceVoteId,
  type AudienceVoteMiniAppResponse,
  type AudienceVoteMiniAppVoteResponse,
  type AudienceVoteTelegramBot,
  type VoteCandidateId,
} from "@/entities/audience-vote";

export async function fetchAudienceVoteMiniAppFeed(
  initData: string,
  options: {
    dashboardPreview?: boolean;
    previewVoteId?: string;
    telegramBot?: AudienceVoteTelegramBot;
  } = {}
): Promise<AudienceVoteMiniAppResponse> {
  const searchParams = new URLSearchParams();
  const telegramBot = options.telegramBot ?? "main";

  searchParams.set("bot", telegramBot);

  if (options.previewVoteId) {
    searchParams.set("voteId", options.previewVoteId);
  }

  const url = searchParams.size
    ? `/api/audience-vote/mini-app?${searchParams.toString()}`
    : "/api/audience-vote/mini-app";

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-audience-vote-telegram-bot": telegramBot,
      "x-telegram-init-data": initData,
      ...(options.dashboardPreview
        ? { "x-dashboard-mini-app-preview": "1" }
        : {}),
    },
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      parseMiniAppApiErrorMessage({
        fallback: "Не вдалося завантажити голосування.",
        status: response.status,
        value: json,
      })
    );
  }

  return parseAudienceVoteMiniAppResponse(json);
}

export async function saveAudienceVoteMiniAppVote({
  audienceVoteId,
  candidateId,
  initData,
  telegramBot = "main",
}: {
  audienceVoteId: AudienceVoteId;
  candidateId: VoteCandidateId;
  initData: string;
  telegramBot?: AudienceVoteTelegramBot;
}): Promise<AudienceVoteMiniAppVoteResponse> {
  const response = await fetch("/api/audience-vote/mini-app", {
    body: JSON.stringify({
      audience_vote_id: audienceVoteId,
      candidate_id: candidateId,
    }),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-audience-vote-telegram-bot": telegramBot,
      "x-telegram-init-data": initData,
    },
    method: "POST",
  });
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      parseMiniAppApiErrorMessage({
        fallback: "Не вдалося зберегти голос.",
        status: response.status,
        value: json,
      })
    );
  }

  return parseAudienceVoteMiniAppVoteResponse(json);
}

function parseMiniAppApiErrorMessage({
  fallback,
  status,
  value,
}: {
  fallback: string;
  status: number;
  value: unknown;
}): string {
  if (status >= 500) {
    return fallback;
  }

  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return fallback;
}
