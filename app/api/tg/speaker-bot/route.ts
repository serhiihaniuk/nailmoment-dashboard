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

async function initiateVotingFlow(ctx: Context) {
  const telegramUserId = ctx.from!.id;
  try {
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    if (existingVote.length > 0) {
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

// --- THIS IS THE CORRECTED BLOCK ---
bot.callbackQuery(/^reset_vote:(\d+)$/, async (ctx) => {
  const telegramUserId = ctx.from!.id;

  try {
    // 1. Delete the user's vote from the database
    await db
      .delete(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId));

    // 2. Acknowledge the click with a helpful popup
    await ctx.answerCallbackQuery({
      text: "Ваш голос скинуто! Надсилаю всі варіанти знову...",
    });

    // 3. Clean up the message where the button was clicked
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2("✅ Ваш попередній голос видалено."),
      parse_mode: "MarkdownV2",
      // The keyboard is removed automatically by not providing a `reply_markup`
    });

    // 4. CRITICAL FIX: Re-run the main voting flow.
    // Since the user's vote is now deleted, this will show them all 10 videos again.
    await initiateVotingFlow(ctx);
  } catch (error) {
    console.error("Error resetting vote:", error);
    await ctx.answerCallbackQuery({
      text: "Помилка під час скидання голосу.",
      show_alert: true,
    });
  }
});

// --- The rest of the file remains the same ---

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
