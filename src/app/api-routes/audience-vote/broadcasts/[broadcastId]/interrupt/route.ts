import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseRouteParams } from "@/app/api-routes/lib/request";
import {
  audienceVoteBroadcastIdSchema,
  parseAudienceVoteBroadcast,
} from "@/entities/audience-vote";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import {
  AudienceVoteBroadcastInterruptError,
  createAudienceVoteBroadcastService,
} from "@/shared/db/service/audience-vote-broadcast-service";

const audienceVoteBroadcastService = createAudienceVoteBroadcastService(db);

const broadcastRouteParamsSchema = z.object({
  broadcastId: audienceVoteBroadcastIdSchema,
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ broadcastId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      broadcastRouteParamsSchema
    );
    if (!parsedParams.ok) return parsedParams.response;

    const broadcast =
      await audienceVoteBroadcastService.interruptAudienceVoteBroadcast({
        broadcastId: parsedParams.data.broadcastId,
      });

    return broadcast
      ? NextResponse.json(parseAudienceVoteBroadcast(broadcast), {
          status: 200,
        })
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("API Error interrupting audience vote broadcast:", error);

    if (error instanceof AudienceVoteBroadcastInterruptError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Could not interrupt Audience Vote Broadcast.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
