import { Bot, InlineKeyboard, webhookCallback, type Context } from "grammy";
import { NextResponse } from "next/server";

import {
  defaultAudienceVoteBotSettings,
  type PublicAudienceVoteBotSettings,
} from "@/entities/audience-vote";
import {
  readConfiguredTelegramAudienceVoteBotConfigs,
  type TelegramAudienceVoteBotConfig,
} from "@/shared/config/env";
import { db } from "@/shared/db";
import { isPostgresUndefinedTableError } from "@/shared/db/postgres-errors";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import {
  isValidTelegramWebhookSecret,
  TELEGRAM_WEBHOOK_SECRET_HEADER,
} from "@/shared/telegram/webhook-secret";

const audienceVoteService = createAudienceVoteService(db);

const UNKNOWN_TELEGRAM_USER_MESSAGE =
  "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0432\u0438\u0437\u043d\u0430\u0447\u0438\u0442\u0438 \u0432\u0430\u0448 Telegram \u043f\u0440\u043e\u0444\u0456\u043b\u044c. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.";

function createAudienceVoteBot(config: TelegramAudienceVoteBotConfig) {
  const bot = new Bot(config.token);

  bot.command("start", (ctx) => handleMiniAppEntry(ctx, config));
  bot.command("vote", (ctx) => handleMiniAppEntry(ctx, config));

  return bot;
}

async function handleMiniAppEntry(
  ctx: Context,
  config: TelegramAudienceVoteBotConfig
) {
  if (!ctx.from) {
    await ctx.reply(UNKNOWN_TELEGRAM_USER_MESSAGE);
    return;
  }

  await audienceVoteService.upsertTelegramVoter({
    firstName: ctx.from.first_name,
    telegramBot: config.key,
    telegramUserId: ctx.from.id,
    username: ctx.from.username ?? null,
  });

  const botSettings = await getAudienceVoteBotSettings();

  await ctx.reply(botSettings.start_message, {
    reply_markup: new InlineKeyboard().webApp(
      botSettings.start_button_text,
      config.miniAppUrl
    ),
  });
}

async function getAudienceVoteBotSettings(): Promise<PublicAudienceVoteBotSettings> {
  try {
    return (
      (await audienceVoteService.getAudienceVoteBotSettings()) ??
      defaultAudienceVoteBotSettings
    );
  } catch (error) {
    if (isPostgresUndefinedTableError(error, "audience_vote_bot_settings")) {
      return defaultAudienceVoteBotSettings;
    }

    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const actualSecret = request.headers.get(TELEGRAM_WEBHOOK_SECRET_HEADER);
    const config = readConfiguredTelegramAudienceVoteBotConfigs().find(
      (candidate) =>
        isValidTelegramWebhookSecret({
          actual: actualSecret,
          expected: candidate.webhookSecret,
        })
    );

    if (!config) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return await webhookCallback(createAudienceVoteBot(config), "std/http")(
      request
    );
  } catch (error) {
    console.error("Audience Vote bot webhook failed:", error);
    const message =
      error instanceof Error ? error.message : "Audience Vote bot failed.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
