import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import {
  parseAudienceVote,
  parseAudienceVoteList,
} from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import type { InsertAudienceVote } from "@/shared/db/schema";
import {
  createAudienceVoteClientSchema,
  type CreateAudienceVoteClientOutput,
} from "@/shared/db/schema.zod";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);

function toDbAudienceVotePayload(
  clientData: CreateAudienceVoteClientOutput
): InsertAudienceVote {
  return {
    archived: false,
    id: nanoid(12),
    kind: clientData.kind,
    status: clientData.status,
    title: clientData.title,
    window_end: clientData.window_end,
    window_start: clientData.window_start,
  };
}

export async function GET() {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const votes = await audienceVoteService.getAudienceVotes({
      archived: false,
    });

    return NextResponse.json(parseAudienceVoteList(votes), { status: 200 });
  } catch (error) {
    console.error("API Error fetching audience votes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch audience votes.";

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
      createAudienceVoteClientSchema,
      { errorFormat: "fieldErrors" }
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const vote = await audienceVoteService.addAudienceVote(
      toDbAudienceVotePayload(parsed.data)
    );

    return NextResponse.json(parseAudienceVote(vote), { status: 201 });
  } catch (error) {
    console.error("API Error adding audience vote:", error);
    const message =
      error instanceof Error ? error.message : "Could not add audience vote.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

