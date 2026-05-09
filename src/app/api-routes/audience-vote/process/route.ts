import { NextResponse } from "next/server";

import { db } from "@/shared/db";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import { validateAudienceVoteBroadcastProcessorSecret } from "../broadcasts/processor-auth";

const audienceVoteService = createAudienceVoteService(db);

export async function GET(request: Request) {
  try {
    const unauthorized = validateAudienceVoteBroadcastProcessorSecret(request);
    if (unauthorized) return unauthorized;

    const closedVotes =
      await audienceVoteService.closeExpiredOpenAudienceVotes();

    return NextResponse.json(
      {
        closed: closedVotes.length,
        vote_ids: closedVotes.map((vote) => vote.id),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error processing audience vote lifecycle:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not process Audience Vote lifecycle.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
