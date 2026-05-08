import { Bot, InlineKeyboard, webhookCallback, type Context } from "grammy";
import { NextResponse } from "next/server";

import {
  readTelegramAudienceVoteBotToken,
  readTelegramAudienceVoteMiniAppUrl,
  readTelegramAudienceVoteWebhookSecret,
} from "@/shared/config/env";
import { db } from "@/shared/db";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import {
  isValidTelegramWebhookSecret,
  TELEGRAM_WEBHOOK_SECRET_HEADER,
} from "@/shared/telegram/webhook-secret";

const audienceVoteService = createAudienceVoteService(db);

const MINI_APP_ENTRY_MESSAGE =
  "Привіт! Голосування Nail Moment проходить у Mini App. Натисніть кнопку нижче, щоб відкрити голосування.";
const MINI_APP_ENTRY_BUTTON = "Відкрити голосування";
const UNKNOWN_TELEGRAM_USER_MESSAGE =
  "Не вдалося визначити ваш Telegram профіль. Спробуйте ще раз.";

function createAudienceVoteBot() {
  const bot = new Bot(readTelegramAudienceVoteBotToken());

  bot.command("start", handleMiniAppEntry);
  bot.command("vote", handleMiniAppEntry);

  return bot;
}

async function handleMiniAppEntry(ctx: Context) {
  if (!ctx.from) {
    await ctx.reply(UNKNOWN_TELEGRAM_USER_MESSAGE);
    return;
  }

  await audienceVoteService.upsertTelegramVoter({
    firstName: ctx.from.first_name,
    telegramUserId: ctx.from.id,
    username: ctx.from.username ?? null,
  });

  await ctx.reply(MINI_APP_ENTRY_MESSAGE, {
    reply_markup: new InlineKeyboard().webApp(
      MINI_APP_ENTRY_BUTTON,
      readTelegramAudienceVoteMiniAppUrl()
    ),
  });
}

export async function POST(request: Request) {
  try {
    const expectedSecret = readTelegramAudienceVoteWebhookSecret();
    const actualSecret = request.headers.get(TELEGRAM_WEBHOOK_SECRET_HEADER);

    if (
      !isValidTelegramWebhookSecret({
        actual: actualSecret,
        expected: expectedSecret,
      })
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return await webhookCallback(createAudienceVoteBot(), "std/http")(request);
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
