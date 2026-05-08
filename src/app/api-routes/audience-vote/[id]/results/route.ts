import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseRouteParams } from "@/app/api-routes/lib/request";
import {
  audienceVoteIdSchema,
  buildAudienceVoteResults,
} from "@/entities/audience-vote";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      z.object({ id: audienceVoteIdSchema })
    );
    if (!parsedParams.ok) return parsedParams.response;

    const vote = await audienceVoteService.getAudienceVote(
      parsedParams.data.id
    );
    if (!vote || vote.archived) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const [candidates, voteCounts] = await Promise.all([
      audienceVoteService.getVoteCandidates({
        archived: false,
        audienceVoteId: parsedParams.data.id,
      }),
      audienceVoteService.getAudienceVoteCurrentVoteCounts(
        parsedParams.data.id
      ),
    ]);

    return NextResponse.json(
      buildAudienceVoteResults({
        audienceVoteId: vote.id,
        candidates,
        voteCounts,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching audience vote results:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch Audience Vote results.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
