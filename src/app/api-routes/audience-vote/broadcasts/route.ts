import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import {
  parseAudienceVoteBroadcast,
  parseAudienceVoteBroadcastList,
} from "@/entities/audience-vote";
import { auth } from "@/shared/better-auth/auth";
import { readTelegramAudienceVoteOperatorTelegramId } from "@/shared/config/env";
import { db } from "@/shared/db";
import { createAudienceVoteBroadcastClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteBroadcastService } from "@/shared/db/service/audience-vote-broadcast-service";
import { processAudienceVoteBroadcastCanary } from "./canary-processor";

const audienceVoteBroadcastService = createAudienceVoteBroadcastService(db);

const operatorTelegramUserIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

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
    const session = await auth.api.getSession({ headers: await headers() });

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
        operatorTelegramUserId: readOperatorTelegramUserId(),
      });

    if (!broadcast) {
      return NextResponse.json(
        { message: "Audience Vote was not found." },
        { status: 404 }
      );
    }

    const processedBroadcast = await processAudienceVoteBroadcastCanary({
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

function readOperatorTelegramUserId() {
  return operatorTelegramUserIdSchema.parse(
    readTelegramAudienceVoteOperatorTelegramId()
  );
}

export const dynamic = "force-dynamic";
