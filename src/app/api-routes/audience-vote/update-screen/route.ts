import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import {
  defaultAudienceVoteUpdateScreen,
  parseAudienceVoteUpdateScreen,
} from "@/entities/audience-vote";
import { auth } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { updateAudienceVoteUpdateScreenClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingUpdateScreen =
      await audienceVoteService.getAudienceVoteUpdateScreen();
    const updateScreen =
      existingUpdateScreen ??
      (await audienceVoteService.upsertAudienceVoteUpdateScreen(
        defaultAudienceVoteUpdateScreen
      ));

    return NextResponse.json(parseAudienceVoteUpdateScreen(updateScreen), {
      status: 200,
    });
  } catch (error) {
    console.error("API Error fetching Audience Vote Update Screen:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch Audience Vote Update Screen.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseRequestJson(
      request,
      updateAudienceVoteUpdateScreenClientSchema,
      { errorFormat: "fieldErrors" }
    );
    if (!parsed.ok) return parsed.response;

    const updateScreen =
      await audienceVoteService.upsertAudienceVoteUpdateScreen(parsed.data);

    return NextResponse.json(parseAudienceVoteUpdateScreen(updateScreen), {
      status: 200,
    });
  } catch (error) {
    console.error("API Error updating Audience Vote Update Screen:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not update Audience Vote Update Screen.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
