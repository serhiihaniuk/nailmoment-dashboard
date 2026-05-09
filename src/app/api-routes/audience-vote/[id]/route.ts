import { NextResponse } from "next/server";

import {
  objectKeys,
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";
import { parseAudienceVote } from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { patchAudienceVoteScheduleClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import {
  audienceVoteRouteParamsSchema,
  audienceVoteTransitionErrorResponse,
} from "./transition-response";

const audienceVoteService = createAudienceVoteService(db);

export async function PATCH(
  request: Request,
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

    const parsed = await parseRequestJson(
      request,
      patchAudienceVoteScheduleClientSchema,
      { errorFormat: "fieldErrors" }
    );
    if (!parsed.ok) return parsed.response;

    if (objectKeys(parsed.data).length === 0) {
      return NextResponse.json(
        { message: "Nothing to update" },
        { status: 400 }
      );
    }

    const vote = await audienceVoteService.updateAudienceVoteSchedule(
      parsedParams.data.id,
      parsed.data
    );

    return vote
      ? NextResponse.json(parseAudienceVote(vote), { status: 200 })
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("API Error updating audience vote schedule:", error);
    return audienceVoteTransitionErrorResponse({
      error,
      fallbackMessage: "Could not update Audience Vote schedule.",
    });
  }
}

export const dynamic = "force-dynamic";
