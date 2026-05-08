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
  "\u041f\u0440\u0438\u0432\u0456\u0442! \u0413\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f Nail Moment \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442\u044c \u0443 Mini App. \u041d\u0430\u0442\u0438\u0441\u043d\u0456\u0442\u044c \u043a\u043d\u043e\u043f\u043a\u0443 \u043d\u0438\u0436\u0447\u0435, \u0449\u043e\u0431 \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f.";
const MINI_APP_ENTRY_BUTTON =
  "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f";
const UNKNOWN_TELEGRAM_USER_MESSAGE =
  "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0432\u0438\u0437\u043d\u0430\u0447\u0438\u0442\u0438 \u0432\u0430\u0448 Telegram \u043f\u0440\u043e\u0444\u0456\u043b\u044c. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.";

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
