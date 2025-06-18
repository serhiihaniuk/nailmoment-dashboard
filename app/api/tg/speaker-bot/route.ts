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
const WELCOME_MESSAGE = `Привіт! Я — бот Nail Moment, і я допоможу визначити переможця конкурсу «Народний спікер», який проходить у рамках підготовки до нашого фестивалю у Вроцлаві 💛💅

🎤 Переможець конкурсу виступить на головній сцені Nail Moment 27 липня 2025 року з авторською темою, яка переможе у голосуванні.

📍 Фестиваль Nail Moment відбудеться 27 липня 2025 у місті Вроцлав (Польща). Детальні умови участі та опис фестивалю шукай на нашому сайті.

📹 Відеопрезентації учасників уже доступні! Їх можна подивитися в нашому Telegram-каналі або Instagram. Перед тим, як голосувати, обов’язково переглянь усі заявки — там стільки натхнення!

Голосування проходитиме в цьому чат-боті 💬
Хто стане наступною зіркою нашої сцени? Обираєш саме ти!`;

const videoFileId =
  "BAACAgIAAxkBAAM4aFKy9LgXGvquLiQOKW-6yJ-S92MAArR3AAJaF5FKinLH6B9VFCA2BA";
const SPEAKERS = Array.from({ length: 3 }, (_, i) => ({
  id: `video_${i + 1}`,
  file_id: videoFileId,
}));

function escapeMarkdownV2(text: string): string {
  const charsToEscape = /[_\[\]()~`>#+\-=|{}.!]/g;
  return text.replace(charsToEscape, (char) => `\\${char}`);
}

// --- CORE LOGIC (RE-WRITTEN) ---

async function initiateVotingFlow(ctx: Context) {
  const telegramUserId = ctx.from!.id;
  try {
    // 1. Check the user's voting status once.
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    const votedForId =
      existingVote.length > 0 ? existingVote[0].voted_for_id : null;

    await ctx.reply(
      escapeMarkdownV2("Будь ласка, перегляньте відео та зробіть свій вибір:"),
      { parse_mode: "MarkdownV2" }
    );

    // 2. Always send all videos.
    for (let i = 0; i < SPEAKERS.length; i++) {
      const videoNumber = i + 1;
      const speaker = SPEAKERS[i];
      let caption: string;
      let keyboard: InlineKeyboard;

      // 3. Dynamically set the caption and button based on voting status.
      if (speaker.id === votedForId) {
        // This is the video they voted for
        caption = escapeMarkdownV2(`✅ Ви обрали Відео #${videoNumber}`);
        keyboard = new InlineKeyboard().text(
          "Скинути мій голос 🔄",
          `reset_vote:${videoNumber}`
        );
      } else {
        // This is any other video
        caption = escapeMarkdownV2(`Це Відео #${videoNumber}`);
        keyboard = new InlineKeyboard().text(
          "Проголосувати за це 👍",
          `vote:${videoNumber}`
        );
      }

      await ctx.replyWithVideo(speaker.file_id, {
        caption: caption,
        reply_markup: keyboard,
        parse_mode: "MarkdownV2",
      });
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

    // After voting, re-run the main flow to show the new "voted" state
    await initiateVotingFlow(ctx);
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
  try {
    await db
      .delete(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId));
    await ctx.answerCallbackQuery({
      text: "Ваш голос скинуто! Тепер ви можете голосувати знову.",
    });

    // After resetting, re-run the main flow to show the "new user" state
    await initiateVotingFlow(ctx);
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
