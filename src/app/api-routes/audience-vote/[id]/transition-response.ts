import { NextResponse } from "next/server";
import { z } from "zod";

import {
  audienceVoteIdSchema,
  validateAudienceVoteOpenReadiness,
  type AudienceVoteOpenValidationIssue,
} from "@/entities/audience-vote";
import {
  AudienceVoteTransitionError,
  type IAudienceVoteService,
} from "@/shared/db/service/audience-vote-service";

const openConflictIssueCodes = new Set<AudienceVoteOpenValidationIssue["code"]>(
  ["already_open", "another_vote_open", "closed_final", "not_openable_status"]
);

export const audienceVoteRouteParamsSchema = z.object({
  id: audienceVoteIdSchema,
});

export function audienceVoteTransitionErrorResponse({
  error,
  fallbackMessage,
}: {
  error: unknown;
  fallbackMessage: string;
}) {
  if (error instanceof AudienceVoteTransitionError) {
    return NextResponse.json(
      { issues: error.issues, message: error.message },
      { status: error.status }
    );
  }

  const message =
    error instanceof Error ? error.message : "Could not update Audience Vote.";

  return NextResponse.json(
    { message: `Internal Server Error: ${message || fallbackMessage}` },
    { status: 500 }
  );
}

export async function validateAudienceVoteCanOpen({
  audienceVoteId,
  service,
}: {
  audienceVoteId: string;
  service: IAudienceVoteService;
}) {
  const vote = await service.getAudienceVote(audienceVoteId);

  if (!vote || vote.archived) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const [activeCandidates, otherOpenVote] = await Promise.all([
    service.getVoteCandidates({
      archived: false,
      audienceVoteId: vote.id,
    }),
    service.getOpenAudienceVote(vote.id),
  ]);
  const activeMediaCountsByCandidateId = new Map<string, number>();

  await Promise.all(
    activeCandidates.map(async (candidate) => {
      const activeMedia = await service.getVoteCandidateMediaList({
        archived: false,
        candidateId: candidate.id,
      });
      activeMediaCountsByCandidateId.set(candidate.id, activeMedia.length);
    })
  );

  const issues = validateAudienceVoteOpenReadiness({
    activeCandidates,
    activeMediaCountsByCandidateId,
    otherOpenVote: otherOpenVote ?? null,
    vote,
  });

  if (issues.length === 0) {
    return null;
  }

  return NextResponse.json(
    { issues, message: "Audience Vote cannot be opened." },
    { status: getOpenValidationStatus(issues) }
  );
}

function getOpenValidationStatus(
  issues: AudienceVoteOpenValidationIssue[]
): number {
  return issues.some((issue) => openConflictIssueCodes.has(issue.code))
    ? 409
    : 400;
}
