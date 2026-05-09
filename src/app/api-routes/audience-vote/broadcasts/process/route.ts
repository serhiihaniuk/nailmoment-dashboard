import { NextResponse } from "next/server";

import { db } from "@/shared/db";
import { createAudienceVoteBroadcastService } from "@/shared/db/service/audience-vote-broadcast-service";
import { processDueAudienceVoteBroadcasts } from "../broadcast-processor";
import { validateAudienceVoteBroadcastProcessorSecret } from "../processor-auth";

const audienceVoteBroadcastService = createAudienceVoteBroadcastService(db);

export async function GET(request: Request) {
  try {
    const unauthorized = validateAudienceVoteBroadcastProcessorSecret(request);
    if (unauthorized) return unauthorized;

    const result = await processDueAudienceVoteBroadcasts({
      service: audienceVoteBroadcastService,
    });

    return NextResponse.json(
      {
        broadcast_ids: result.processed.map((broadcast) => broadcast.id),
        processed: result.processed.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error processing due audience vote broadcasts:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not process due Audience Vote Broadcasts.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
