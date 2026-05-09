import { NextResponse } from "next/server";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import {
  defaultAudienceVoteBotSettings,
  parseAudienceVoteBotSettings,
} from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { isPostgresUndefinedTableError } from "@/shared/db/postgres-errors";
import { updateAudienceVoteBotSettingsClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);

export async function GET() {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingBotSettings =
      await audienceVoteService.getAudienceVoteBotSettings();
    const botSettings =
      existingBotSettings ??
      (await audienceVoteService.upsertAudienceVoteBotSettings(
        defaultAudienceVoteBotSettings
      ));

    return NextResponse.json(parseAudienceVoteBotSettings(botSettings), {
      status: 200,
    });
  } catch (error) {
    console.error("API Error fetching Audience Vote Bot Settings:", error);
    if (isPostgresUndefinedTableError(error, "audience_vote_bot_settings")) {
      return missingBotSettingsTableResponse();
    }

    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch Audience Vote Bot Settings.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseRequestJson(
      request,
      updateAudienceVoteBotSettingsClientSchema,
      { errorFormat: "fieldErrors" }
    );
    if (!parsed.ok) return parsed.response;

    const botSettings =
      await audienceVoteService.upsertAudienceVoteBotSettings(parsed.data);

    return NextResponse.json(parseAudienceVoteBotSettings(botSettings), {
      status: 200,
    });
  } catch (error) {
    console.error("API Error updating Audience Vote Bot Settings:", error);
    if (isPostgresUndefinedTableError(error, "audience_vote_bot_settings")) {
      return missingBotSettingsTableResponse();
    }

    const message =
      error instanceof Error
        ? error.message
        : "Could not update Audience Vote Bot Settings.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

function missingBotSettingsTableResponse() {
  return NextResponse.json(
    {
      code: "missing_database_table",
      message:
        "Database table audience_vote_bot_settings is missing. Apply drizzle/0031_audience_vote_bot_settings.sql before editing this message.",
    },
    { status: 503 }
  );
}
