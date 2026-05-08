import { NextResponse } from "next/server";

import { parseAudienceVoteMiniAppResponse } from "@/entities/audience-vote";
import { readTelegramAudienceVoteBotToken } from "@/shared/config/env";
import { db } from "@/shared/db";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import { validateTelegramMiniAppInitData } from "@/shared/telegram/mini-app-init-data";

const audienceVoteService = createAudienceVoteService(db);

const fallbackUpdateScreen = {
  message:
    "Наразі немає відкритого голосування. Ми покажемо нове голосування тут, щойно воно стартує.",
  title: "Голосування скоро",
};

export async function GET(request: Request) {
  try {
    const initData = readTelegramInitData(request);

    if (!initData) {
      return NextResponse.json(
        { message: "Telegram initData is required." },
        { status: 401 }
      );
    }

    const validatedInitData = validateTelegramMiniAppInitData(
      initData,
      readTelegramAudienceVoteBotToken()
    );

    if (!validatedInitData.ok) {
      return NextResponse.json(
        { message: "Invalid Telegram initData." },
        { status: 401 }
      );
    }

    await audienceVoteService.upsertTelegramVoter({
      firstName: validatedInitData.user.firstName,
      telegramUserId: validatedInitData.user.id,
      username: validatedInitData.user.username ?? null,
    });

    const openVote = await audienceVoteService.getOpenAudienceVote();

    if (!openVote) {
      return NextResponse.json(
        parseAudienceVoteMiniAppResponse({
          status: "update_screen",
          update_screen: fallbackUpdateScreen,
        }),
        { status: 200 }
      );
    }

    const candidates = await audienceVoteService.getVoteCandidates({
      archived: false,
      audienceVoteId: openVote.id,
    });
    const candidatesWithMedia = await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        media: await audienceVoteService.getVoteCandidateMediaList({
          archived: false,
          candidateId: candidate.id,
        }),
      }))
    );

    return NextResponse.json(
      parseAudienceVoteMiniAppResponse({
        candidates: candidatesWithMedia,
        status: "open_vote",
        vote: openVote,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching Audience Vote Mini App feed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch Audience Vote Mini App feed.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

function readTelegramInitData(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  const authMatch = authorization?.match(/^tma\s+(.+)$/i);

  if (authMatch?.[1]?.trim()) {
    return authMatch[1].trim();
  }

  const headerValue = request.headers.get("x-telegram-init-data")?.trim();

  return headerValue && headerValue.length > 0 ? headerValue : undefined;
}

export const dynamic = "force-dynamic";
