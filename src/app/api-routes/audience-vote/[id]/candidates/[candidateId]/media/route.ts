import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseRouteParams } from "@/app/api-routes/lib/request";
import {
  audienceVoteIdSchema,
  parseVoteCandidateMediaList,
  voteCandidateIdSchema,
} from "@/entities/audience-vote";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import type { VoteCandidate } from "@/shared/db/schema";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);
const voteCandidateMediaRouteParamsSchema = z.object({
  candidateId: voteCandidateIdSchema,
  id: audienceVoteIdSchema,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string; id: string }> }
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

    const candidate = getCandidateForVote({
      audienceVoteId: vote.id,
      candidate: await audienceVoteService.getVoteCandidate(
        parsedParams.data.candidateId
      ),
    });
    if (!candidate) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const media = await audienceVoteService.getVoteCandidateMediaList({
      candidateId: candidate.id,
    });

    return NextResponse.json(parseVoteCandidateMediaList(media), {
      status: 200,
    });
  } catch (error) {
    console.error("API Error fetching vote candidate media:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch vote candidate media.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
