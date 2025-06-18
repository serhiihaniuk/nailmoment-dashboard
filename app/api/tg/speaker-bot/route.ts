// src/app/api/bot/route.ts

import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { db } from "@/shared/db";
import { speakerVoteTGTable } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const token = process.env.TG_BOT;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

// --- CONSTANTS & HELPERS ---
const WELCOME_MESSAGE = `Привіт! Я — бот Nail Moment... (your full welcome message)`;

// 1. Use the provided file_id for all videos.
const videoFileId =
  "BAACAgIAAxkBAAM4aFKy9LgXGvquLiQOKW-6yJ-S92MAArR3AAJaF5FKinLH6B9VFCA2BA";
const SPEAKERS = Array.from({ length: 10 }, (_, i) => ({
  id: `video_${i + 1}`,
  file_id: videoFileId,
}));

function escapeMarkdownV2(text: string): string {
  const charsToEscape = /[_\[\]()~`>#+\-=|{}.!]/g;
  return text.replace(charsToEscape, (char) => `\\${char}`);
}

// --- CORE LOGIC ---

// This function is the main entry point for the voting process.
async function initiateVotingFlow(ctx: Context) {
  const telegramUserId = ctx.from!.id;

  try {
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    if (existingVote.length > 0) {
      // User has already voted. Show them their choice with a reset button.
      const votedForId = existingVote[0].voted_for_id;
      const videoIndex = SPEAKERS.findIndex((s) => s.id === votedForId);
      const videoNumber = videoIndex + 1;

      if (videoIndex !== -1) {
        await ctx.reply(
          escapeMarkdownV2("Ви вже проголосували. Ось ваш вибір:"),
          { parse_mode: "MarkdownV2" }
        );
        const resetKeyboard = new InlineKeyboard().text(
          "Скинути мій голос 🔄",
          `reset_vote:${videoNumber}`
        );
        await ctx.replyWithVideo(SPEAKERS[videoIndex].file_id, {
          caption: escapeMarkdownV2(`✅ Ви обрали Відео #${videoNumber}`),
          reply_markup: resetKeyboard,
          parse_mode: "MarkdownV2",
        });
      }
    } else {
      // User has not voted. Send all videos, each with a vote button.
      await ctx.reply(
        escapeMarkdownV2(
          "Будь ласка, перегляньте відео та зробіть свій вибір:"
        ),
        { parse_mode: "MarkdownV2" }
      );
      for (let i = 0; i < SPEAKERS.length; i++) {
        const videoNumber = i + 1;
        const speaker = SPEAKERS[i];
        const voteKeyboard = new InlineKeyboard().text(
          "Проголосувати за це 👍",
          `vote:${videoNumber}`
        );
        await ctx.replyWithVideo(speaker.file_id, {
          caption: escapeMarkdownV2(`Це Відео #${videoNumber}`),
          reply_markup: voteKeyboard,
          parse_mode: "MarkdownV2",
        });
      }
    }
  } catch (error) {
    console.error("Error in initiateVotingFlow:", error);
    await ctx.reply("Вибачте, сталася помилка. Спробуйте пізніше.");
  }
}

// --- BOT COMMANDS AND CALLBACKS ---

bot.command("start", async (ctx) => {
  const showVideosKeyboard = new InlineKeyboard().text(
    "Показати відео для голосування",
    "show_videos"
  );
  await ctx.reply(escapeMarkdownV2(WELCOME_MESSAGE), {
    reply_markup: showVideosKeyboard,
    parse_mode: "MarkdownV2",
  });
});

bot.command("vote", (ctx) => initiateVotingFlow(ctx));

bot.callbackQuery("show_videos", async (ctx) => {
  await ctx.answerCallbackQuery();
  // Remove the button from the welcome message for a cleaner look
  await ctx.editMessageReplyMarkup();
  await initiateVotingFlow(ctx);
});

bot.callbackQuery(/^vote:(\d+)$/, async (ctx) => {
  const telegramUserId = ctx.from!.id;
  const videoNumber = parseInt(ctx.match[1], 10);
  const votedForId = `video_${videoNumber}`;

  const existingVote = await db
    .select()
    .from(speakerVoteTGTable)
    .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
    .limit(1);
  if (existingVote.length > 0) {
    await ctx.answerCallbackQuery({
      text: "Ви вже проголосували. Спочатку скиньте попередній голос.",
    });
    return;
  }

  try {
    await db.insert(speakerVoteTGTable).values({
      id: nanoid(),
      telegram_user_id: telegramUserId,
      voted_for_id: votedForId,
    });
    await ctx.answerCallbackQuery({ text: "Дякую! Ваш голос збережено." });

    // Edit the message to show confirmation and a reset button
    const resetKeyboard = new InlineKeyboard().text(
      "Скинути мій голос 🔄",
      `reset_vote:${videoNumber}`
    );
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(
        `✅ Проголосовано! Ви обрали Відео #${videoNumber}`
      ),
      reply_markup: resetKeyboard,
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    console.error("Error processing vote:", error);
    await ctx.answerCallbackQuery({
      text: "Сталася помилка, або ви вже проголосували.",
      show_alert: true,
    });
  }
});

bot.callbackQuery(/^reset_vote:(\d+)$/, async (ctx) => {
  const telegramUserId = ctx.from!.id;
  const videoNumber = parseInt(ctx.match[1], 10);

  try {
    await db
      .delete(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId));
    await ctx.answerCallbackQuery({
      text: "Ваш голос скинуто! Тепер ви можете голосувати знову.",
    });

    // Edit the message back to its original state
    const voteKeyboard = new InlineKeyboard().text(
      "Проголосувати за це 👍",
      `vote:${videoNumber}`
    );
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(`Це Відео #${videoNumber}`),
      reply_markup: voteKeyboard,
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    console.error("Error resetting vote:", error);
    await ctx.answerCallbackQuery({
      text: "Помилка під час скидання голосу.",
      show_alert: true,
    });
  }
});

bot.on("message:video", async (ctx) => {
  const fileId = ctx.message.video.file_id;
  const safeText = escapeMarkdownV2(`Отримано відео. \n\nВаш file_id: `);
  await ctx.reply(`${safeText}\`${fileId}\``, { parse_mode: "MarkdownV2" });
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(
    escapeMarkdownV2(
      "Будь ласка, використовуйте команду /start, щоб розпочати."
    )
  );
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
