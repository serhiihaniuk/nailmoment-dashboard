// src/app/api/bot/route.ts

import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { db } from "@/shared/db";
import { speakerVoteTGTable } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const token = process.env.TG_BOT;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

// --- CONSTANTS AND KEYBOARD GENERATORS ---
const WELCOME_MESSAGE = `Привіт! Я — бот Nail Moment... (your full welcome message)`;

const SPEAKERS = [
  { id: "video_1", file_id: "PASTE_YOUR_REAL_FILE_ID_FOR_VIDEO_1" },
  { id: "video_2", file_id: "PASTE_YOUR_REAL_FILE_ID_FOR_VIDEO_2" },
  // ... and so on for all 10 videos
];

function generateVotingKeyboard() {
  const keyboard = new InlineKeyboard();
  SPEAKERS.forEach((speaker, index) => {
    keyboard.text(`Проголосувати за Відео #${index + 1}`, `vote:${index + 1}`);
    if ((index + 1) % 2 === 0) keyboard.row();
  });
  return keyboard;
}

function generateMainMenuKeyboard() {
  return new InlineKeyboard().text(
    "Показати відео для голосування",
    "show_videos"
  );
}

function generatePostVoteKeyboard() {
  return new InlineKeyboard()
    .text("Скинути мій голос 🔄", "reset_vote")
    .row()
    .text("Повернутися в головне меню", "main_menu");
}

// --- CORE LOGIC HANDLER ---
async function handleShowVotingProcess(ctx: Context) {
  const telegramUserId = ctx.from!.id;
  try {
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    if (existingVote.length > 0) {
      await ctx.editMessageText(
        `Ви вже проголосували за: ${existingVote[0].voted_for_id}.`,
        { reply_markup: generatePostVoteKeyboard() }
      );
    } else {
      await ctx.reply("Зараз я надішлю відео всіх учасників для перегляду...");

      for (const speaker of SPEAKERS) {
        await ctx.replyWithVideo(speaker.file_id, {
          caption: `Це Відео #${speaker.id.split("_")[1]}`,
        });
      }

      await ctx.editMessageText(
        "Відео вище. Будь ласка, зробіть свій вибір, використовуючи кнопки нижче:",
        { reply_markup: generateVotingKeyboard() }
      );
    }
  } catch (error) {
    console.error("Error in handleShowVotingProcess:", error);
    await ctx.reply("Вибачте, сталася помилка бази даних. Спробуйте пізніше.");
  }
}

// --- BOT COMMANDS AND CALLBACKS ---
bot.command("start", async (ctx) => {
  await ctx.reply(WELCOME_MESSAGE, {
    reply_markup: generateMainMenuKeyboard(),
  });
});

bot.command("vote", async (ctx) => {
  const tempMessage = await ctx.reply("Завантаження...");
  ctx.update.callback_query = {
    id: "",
    from: ctx.from!,
    message: tempMessage,
    chat_instance: "",
    data: "show_videos",
  };
  await handleShowVotingProcess(ctx);
});

bot.callbackQuery("show_videos", async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleShowVotingProcess(ctx);
});

bot.callbackQuery("reset_vote", async (ctx) => {
  const telegramUserId = ctx.from!.id;
  try {
    await db
      .delete(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId));
    await ctx.answerCallbackQuery({ text: "Ваш голос скинуто!" });

    await ctx.reply("Ви можете проголосувати знову. Надсилаю відео...");
    for (const speaker of SPEAKERS) {
      await ctx.replyWithVideo(speaker.file_id, {
        caption: `Це Відео #${speaker.id.split("_")[1]}`,
      });
    }

    await ctx.editMessageText(
      "Ваш попередній голос видалено. Будь ласка, оберіть знову:",
      { reply_markup: generateVotingKeyboard() }
    );
  } catch (error) {
    console.error("Error resetting vote:", error);
    await ctx.answerCallbackQuery({
      text: "Помилка під час скидання голосу.",
      show_alert: true,
    });
  }
});

bot.callbackQuery(/^vote:(\d+)$/, async (ctx) => {
  const telegramUserId = ctx.from!.id;

  const existingVote = await db
    .select()
    .from(speakerVoteTGTable)
    .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
    .limit(1);
  if (existingVote.length > 0) {
    await ctx.answerCallbackQuery({
      text: "Ви вже проголосували. Щоб змінити вибір, натисніть 'Скинути мій голос'.",
    });
    return;
  }

  try {
    const videoNumber = ctx.match[1];
    const votedForId = `video_${videoNumber}`;

    await db.insert(speakerVoteTGTable).values({
      id: nanoid(),
      telegram_user_id: telegramUserId,
      voted_for_id: votedForId,
    });

    await ctx.answerCallbackQuery({ text: "Дякую! Ваш голос збережено." });

    await ctx.editMessageText(
      `✅ Проголосовано! Ви обрали ${votedForId.replace("_", " ")}.`,
      { reply_markup: generatePostVoteKeyboard() }
    );
  } catch (error) {
    console.error("Error processing vote (likely a race condition):", error);
    await ctx.answerCallbackQuery({
      text: "Ви вже проголосували.",
      show_alert: true,
    });
  }
});

bot.callbackQuery("main_menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME_MESSAGE, {
    reply_markup: generateMainMenuKeyboard(),
  });
});

// ===================================================================
// === NEW: TEMPORARY HANDLER FOR GETTING VIDEO FILE_IDS           ===
// ===================================================================
// This listener will catch any message that is a video.
bot.on("message:video", async (ctx) => {
  const fileId = ctx.message.video.file_id;

  // Reply to the user with the file_id, formatted for easy copying.
  await ctx.reply(`Отримано відео. \n\nВаш file_id: \`${fileId}\``, {
    parse_mode: "MarkdownV2",
  });
});
// ===================================================================

// This is the fallback for any TEXT message that isn't handled above.
bot.on("message:text", async (ctx) => {
  await ctx.reply("Будь ласка, використовуйте команду /start, щоб розпочати.");
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
