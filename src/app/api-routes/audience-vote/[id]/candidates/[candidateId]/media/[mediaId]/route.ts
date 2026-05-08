import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseRouteParams } from "@/app/api-routes/lib/request";
import {
  audienceVoteIdSchema,
  voteCandidateIdSchema,
  voteCandidateMediaIdSchema,
} from "@/entities/audience-vote";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import type { AudienceVote, VoteCandidate } from "@/shared/db/schema";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);
const mediaSoftDeleteLockedStatuses = new Set<AudienceVote["status"]>([
  "closed",
  "open",
]);
const voteCandidateMediaRouteParamsSchema = z.object({
  candidateId: voteCandidateIdSchema,
  id: audienceVoteIdSchema,
  mediaId: voteCandidateMediaIdSchema,
});

function getCandidateForVote({
  audienceVoteId,
  candidate,
}: {
  audienceVoteId: string;
  candidate: VoteCandidate | undefined;
}) {
  if (
    !candidate ||
    candidate.archived ||
    candidate.audience_vote_id !== audienceVoteId
  ) {
    return undefined;
  }

  return candidate;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string; id: string; mediaId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      voteCandidateMediaRouteParamsSchema
    );
    if (!parsedParams.ok) return parsedParams.response;

    const vote = await audienceVoteService.getAudienceVote(
      parsedParams.data.id
    );
    if (!vote || vote.archived) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (mediaSoftDeleteLockedStatuses.has(vote.status)) {
      return NextResponse.json(
        {
          message:
            "Media can only be soft-deleted before an Audience Vote opens. Upload a replacement while open instead.",
        },
        { status: 403 }
      );
    }

    const candidate = getCandidateForVote({
      audienceVoteId: vote.id,
      candidate: await audienceVoteService.getVoteCandidate(
        parsedParams.data.candidateId
      ),
    });
    if (!candidate) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const media = await audienceVoteService.getVoteCandidateMedia(
      parsedParams.data.mediaId
    );
    if (!media || media.archived || media.candidate_id !== candidate.id) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const deleted = await audienceVoteService.softDeleteVoteCandidateMedia(
      media.id
    );

    return deleted
      ? NextResponse.json(deleted, { status: 200 })
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("API Error deleting vote candidate media:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not delete vote candidate media.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
