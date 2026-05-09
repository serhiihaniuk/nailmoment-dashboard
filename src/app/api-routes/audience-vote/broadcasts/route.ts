import { NextResponse } from "next/server";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import {
  parseAudienceVoteBroadcast,
  parseAudienceVoteBroadcastList,
} from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createAudienceVoteBroadcastClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteBroadcastService } from "@/shared/db/service/audience-vote-broadcast-service";
import { processAudienceVoteBroadcast } from "./broadcast-processor";
import { readAudienceVoteBroadcastOperatorTelegramUserIds } from "./operator-telegram-users";

const audienceVoteBroadcastService = createAudienceVoteBroadcastService(db);

export async function GET() {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const broadcasts =
      await audienceVoteBroadcastService.getAudienceVoteBroadcastSummaries();

    return NextResponse.json(parseAudienceVoteBroadcastList(broadcasts), {
      status: 200,
    });
  } catch (error) {
    console.error("API Error fetching audience vote broadcasts:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch Audience Vote Broadcasts.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseRequestJson(
      request,
      createAudienceVoteBroadcastClientSchema,
      { errorFormat: "fieldErrors" }
    );
    if (!parsed.ok) return parsed.response;

    const broadcast =
      await audienceVoteBroadcastService.createAudienceVoteBroadcast({
        ...parsed.data,
        operatorTelegramUserIds:
          readAudienceVoteBroadcastOperatorTelegramUserIds(),
      });

    if (!broadcast) {
      return NextResponse.json(
        { message: "Audience Vote was not found." },
        { status: 404 }
      );
    }

    const processedBroadcast = await processAudienceVoteBroadcast({
      broadcastId: broadcast.id,
      service: audienceVoteBroadcastService,
    });

    return NextResponse.json(
      parseAudienceVoteBroadcast(processedBroadcast ?? broadcast),
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error creating audience vote broadcast:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not create Audience Vote Broadcast.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
