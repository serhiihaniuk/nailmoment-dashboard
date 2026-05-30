import { NextResponse } from "next/server";

import { parseRequestJson } from "@/app/api-routes/lib/request";
import {
  audienceVoteIdSchema,
  audienceVoteTelegramBotSchema,
  defaultAudienceVoteUpdateScreen,
  parseAudienceVoteMiniAppResponse,
  parseAudienceVoteMiniAppVoteResponse,
  saveAudienceVoteMiniAppVoteRequestSchema,
  type AudienceVoteTelegramBot,
} from "@/entities/audience-vote";
import { readTelegramAudienceVoteBotConfig } from "@/shared/config/env";
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
const TELEGRAM_BOT_HEADER = "x-audience-vote-telegram-bot";

export async function GET(request: Request) {
  try {
    const authenticated = await authenticateMiniAppRequest(request, {
      allowDashboardPreview: true,
    });
    if (!authenticated.ok) return authenticated.response;

    const previewVoteId = new URL(request.url).searchParams
      .get("voteId")
      ?.trim();

    if (previewVoteId) {
      if (!authenticated.dashboardPreview) {
        return NextResponse.json(
          { message: "Dashboard preview is required." },
          { status: 403 }
        );
      }

      const parsedVoteId = audienceVoteIdSchema.safeParse(previewVoteId);

      if (!parsedVoteId.success) {
        return NextResponse.json(
          { message: "Invalid Audience Vote id." },
          { status: 400 }
        );
      }

      const previewVote = await audienceVoteService.getAudienceVote(
        parsedVoteId.data
      );

      if (!previewVote || previewVote.archived) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }

      if (previewVote.telegram_bot !== authenticated.telegramBot) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }

      if (previewVote.status !== "draft" && previewVote.status !== "scheduled") {
        return NextResponse.json(
          { message: "Only unopened votes can be previewed this way." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        await buildOpenVoteResponse({
          selectedCandidateId: null,
          vote: previewVote,
        }),
        { status: 200 }
      );
    }

    const openVote =
      await audienceVoteService.getOpenAudienceVoteForTelegramBot(
        authenticated.telegramBot
      );

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

    const currentVote =
      await audienceVoteService.getCurrentVoteForTelegramVoter({
        audienceVoteId: openVote.id,
        telegramUserId: authenticated.user.id,
      });
    const candidates = await audienceVoteService.getVoteCandidates({
      archived: false,
      audienceVoteId: openVote.id,
    });
    const activeCandidateIds = new Set(
      candidates.map((candidate) => candidate.id)
    );
    const selectedCandidateId =
      currentVote && activeCandidateIds.has(currentVote.candidate_id)
        ? currentVote.candidate_id
        : null;

    return NextResponse.json(
      await buildOpenVoteResponse({
        selectedCandidateId,
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
      telegramBot: authenticated.telegramBot,
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

async function buildOpenVoteResponse({
  selectedCandidateId,
  vote,
}: {
  selectedCandidateId: string | null;
  vote: Awaited<ReturnType<typeof audienceVoteService.getAudienceVote>>;
}) {
  if (!vote) {
    throw new Error("Audience Vote is required.");
  }

  const candidates = await audienceVoteService.getVoteCandidates({
    archived: false,
    audienceVoteId: vote.id,
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

  return parseAudienceVoteMiniAppResponse({
    candidates: candidatesWithMedia,
    selected_candidate_id: selectedCandidateId,
    status: "open_vote",
    vote,
  });
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
  | {
      dashboardPreview: boolean;
      ok: true;
      telegramBot: AudienceVoteTelegramBot;
      user: TelegramMiniAppUser;
    }
  | { ok: false; response: NextResponse }
> {
  const requestedBot = readRequestedTelegramBot(request);
  if (!requestedBot.ok) {
    return requestedBot;
  }

  if (
    options.allowDashboardPreview &&
    request.headers.get("x-dashboard-mini-app-preview") === "1"
  ) {
    const session = await getDashboardSession();

    if (session) {
      return {
        dashboardPreview: true,
        ok: true,
        telegramBot: requestedBot.telegramBot,
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
    readTelegramAudienceVoteBotConfig(requestedBot.telegramBot).token
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
    telegramBot: requestedBot.telegramBot,
    telegramUserId: validatedInitData.user.id,
    username: validatedInitData.user.username ?? null,
  });

  return {
    dashboardPreview: false,
    ok: true,
    telegramBot: requestedBot.telegramBot,
    user: validatedInitData.user,
  };
}

function readRequestedTelegramBot(
  request: Request
):
  | { ok: true; telegramBot: AudienceVoteTelegramBot }
  | { ok: false; response: NextResponse } {
  const url = new URL(request.url);
  const queryValue = url.searchParams.get("bot")?.trim();
  const headerValue = request.headers.get(TELEGRAM_BOT_HEADER)?.trim();
  const rawValue = headerValue || queryValue || "main";
  const parsed = audienceVoteTelegramBotSchema.safeParse(rawValue);

  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid Audience Vote Telegram bot." },
        { status: 400 }
      ),
    };
  }

  return { ok: true, telegramBot: parsed.data };
}

export const dynamic = "force-dynamic";
