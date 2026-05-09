import { NextResponse } from "next/server";

import { parseRouteParams } from "@/app/api-routes/lib/request";
import { parseAudienceVote } from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createAudienceVoteBroadcastService } from "@/shared/db/service/audience-vote-broadcast-service";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import { ensureAudienceVoteOpeningBroadcast } from "../../opening-broadcast";
import {
  audienceVoteRouteParamsSchema,
  audienceVoteTransitionErrorResponse,
  validateAudienceVoteCanOpen,
} from "../transition-response";

const audienceVoteService = createAudienceVoteService(db);
const audienceVoteBroadcastService = createAudienceVoteBroadcastService(db);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      audienceVoteRouteParamsSchema
    );
    if (!parsedParams.ok) return parsedParams.response;

    const validationResponse = await validateAudienceVoteCanOpen({
      audienceVoteId: parsedParams.data.id,
      service: audienceVoteService,
    });
    if (validationResponse) return validationResponse;

    const vote = await audienceVoteService.openAudienceVote(
      parsedParams.data.id
    );

    if (!vote) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    try {
      await ensureAudienceVoteOpeningBroadcast({
        broadcastService: audienceVoteBroadcastService,
        vote,
      });
    } catch (error) {
      console.error("API Error creating opening audience vote broadcast:", error);
    }

    return NextResponse.json(parseAudienceVote(vote), { status: 200 });
  } catch (error) {
    console.error("API Error opening audience vote:", error);
    return audienceVoteTransitionErrorResponse({
      error,
      fallbackMessage: "Could not open Audience Vote.",
    });
  }
}

export const dynamic = "force-dynamic";
