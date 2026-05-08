import {
  parseAudienceVoteMiniAppResponse,
  parseAudienceVoteMiniAppVoteResponse,
  type AudienceVoteId,
  type AudienceVoteMiniAppResponse,
  type AudienceVoteMiniAppVoteResponse,
  type VoteCandidateId,
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
}: {
  audienceVoteId: AudienceVoteId;
  candidateId: VoteCandidateId;
  initData: string;
}): Promise<AudienceVoteMiniAppVoteResponse> {
  const response = await fetch("/api/audience-vote/mini-app", {
    body: JSON.stringify({
      audience_vote_id: audienceVoteId,
      candidate_id: candidateId,
    }),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
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
