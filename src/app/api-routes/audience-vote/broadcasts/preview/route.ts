import { NextResponse } from "next/server";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import { parseAudienceVoteBroadcastPreview } from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { previewAudienceVoteBroadcastClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteBroadcastService } from "@/shared/db/service/audience-vote-broadcast-service";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import { readAudienceVoteBroadcastOperatorTelegramUserIds } from "../operator-telegram-users";

const audienceVoteService = createAudienceVoteService(db);
const audienceVoteBroadcastService = createAudienceVoteBroadcastService(db);

export async function POST(request: Request) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseRequestJson(
      request,
      previewAudienceVoteBroadcastClientSchema,
      { errorFormat: "fieldErrors" }
    );
    if (!parsed.ok) return parsed.response;

    const vote = await audienceVoteService.getAudienceVote(
      parsed.data.audience_vote_id
    );
    if (!vote || vote.archived) {
      return NextResponse.json(
        { message: "Audience Vote was not found." },
        { status: 404 }
      );
    }

    const estimatedRecipientCount =
      await audienceVoteBroadcastService.getActiveBroadcastTargetVoterCount(
        readAudienceVoteBroadcastOperatorTelegramUserIds()
      );

    return NextResponse.json(
      parseAudienceVoteBroadcastPreview({
        ...parsed.data,
        estimated_recipient_count: estimatedRecipientCount,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error previewing audience vote broadcast:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not preview Audience Vote Broadcast.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
