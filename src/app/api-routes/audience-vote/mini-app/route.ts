import { NextResponse } from "next/server";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import {
  defaultAudienceVoteUpdateScreen,
  parseAudienceVoteMiniAppResponse,
  parseAudienceVoteMiniAppVoteResponse,
  saveAudienceVoteMiniAppVoteRequestSchema,
} from "@/entities/audience-vote";
import { readTelegramAudienceVoteBotToken } from "@/shared/config/env";
import { db } from "@/shared/db";
import {
  AudienceVoteWriteError,
  createAudienceVoteService,
} from "@/shared/db/service/audience-vote-service";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { isPostgresUndefinedTableError } from "@/shared/db/postgres-errors";
import type { TelegramMiniAppUser } from "@/shared/telegram/mini-app-init-data";
import { validateTelegramMiniAppInitData } from "@/shared/telegram/mini-app-init-data";

const audienceVoteService = createAudienceVoteService(db);

export async function GET(request: Request) {
  try {
    const authenticated = await authenticateMiniAppRequest(request, {
      allowDashboardPreview: true,
    });
    if (!authenticated.ok) return authenticated.response;

    const openVote = await audienceVoteService.getOpenAudienceVote();

    if (!openVote) {
      const updateScreen = await getSafeAudienceVoteUpdateScreen();

      return NextResponse.json(
        parseAudienceVoteMiniAppResponse({
          status: "update_screen",
          update_screen: updateScreen
            ? {
                message: updateScreen.message,
                title: updateScreen.title,
              }
            : defaultAudienceVoteUpdateScreen,
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
    const currentVote =
      await audienceVoteService.getCurrentVoteForTelegramVoter({
        audienceVoteId: openVote.id,
        telegramUserId: authenticated.user.id,
      });
    const activeCandidateIds = new Set(
      candidates.map((candidate) => candidate.id)
    );
    const selectedCandidateId =
      currentVote && activeCandidateIds.has(currentVote.candidate_id)
        ? currentVote.candidate_id
        : null;

    return NextResponse.json(
      parseAudienceVoteMiniAppResponse({
        candidates: candidatesWithMedia,
        selected_candidate_id: selectedCandidateId,
        status: "open_vote",
        vote: openVote,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching Audience Vote Mini App feed:", error);
    return NextResponse.json(
      { message: "Could not fetch Audience Vote Mini App feed." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authenticated = await authenticateMiniAppRequest(request);
    if (!authenticated.ok) return authenticated.response;

    const parsed = await parseRequestJson(
      request,
      saveAudienceVoteMiniAppVoteRequestSchema
    );
    if (!parsed.ok) return parsed.response;

    const result = await audienceVoteService.saveCurrentVote({
      audienceVoteId: parsed.data.audience_vote_id,
      candidateId: parsed.data.candidate_id,
      telegramUserId: authenticated.user.id,
    });

    return NextResponse.json(
      parseAudienceVoteMiniAppVoteResponse({
        audience_vote_id: result.currentVote.audience_vote_id,
        selected_candidate_id: result.currentVote.candidate_id,
        status: "saved",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error saving Audience Vote Mini App vote:", error);

    if (error instanceof AudienceVoteWriteError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { message: "Could not save Audience Vote." },
      { status: 500 }
    );
  }
}

async function getSafeAudienceVoteUpdateScreen() {
  try {
    return await audienceVoteService.getAudienceVoteUpdateScreen();
  } catch (error) {
    if (
      isPostgresUndefinedTableError(error, "audience_vote_update_screen")
    ) {
      console.warn(
        "Audience Vote update screen table is missing; falling back to default Mini App screen."
      );
      return undefined;
    }

    throw error;
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

async function authenticateMiniAppRequest(
  request: Request,
  options: { allowDashboardPreview?: boolean } = {}
): Promise<
  | { ok: true; user: TelegramMiniAppUser }
  | { ok: false; response: NextResponse }
> {
  if (
    options.allowDashboardPreview &&
    request.headers.get("x-dashboard-mini-app-preview") === "1"
  ) {
    const session = await getDashboardSession();

    if (session) {
      return {
        ok: true,
        user: {
          firstName: "Dashboard",
          id: 0,
          username: "dashboard_preview",
        },
      };
    }
  }

  const initData = readTelegramInitData(request);

  if (!initData) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Telegram initData is required." },
        { status: 401 }
      ),
    };
  }

  const validatedInitData = validateTelegramMiniAppInitData(
    initData,
    readTelegramAudienceVoteBotToken()
  );

  if (!validatedInitData.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid Telegram initData." },
        { status: 401 }
      ),
    };
  }

  await audienceVoteService.upsertTelegramVoter({
    firstName: validatedInitData.user.firstName,
    telegramUserId: validatedInitData.user.id,
    username: validatedInitData.user.username ?? null,
  });

  return { ok: true, user: validatedInitData.user };
}

export const dynamic = "force-dynamic";
