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

const WELCOME_MESSAGE = `Привіт! Я — бот Nail Moment, і я допоможу визначити переможця конкурсу «Народний спікер», який проходить у рамках підготовки до нашого фестивалю у Вроцлаві 💛💅

🎤 Переможець конкурсу виступить на головній сцені Nail Moment 27 липня 2025 року з авторською темою, яка переможе у голосуванні.

📍 Фестиваль Nail Moment відбудеться 27 липня 2025 у місті Вроцлав (Польща). Детальні умови участі та опис фестивалю шукай на нашому сайті.

📹 Відеопрезентації учасників уже доступні! Їх можна подивитися в нашому Telegram-каналі або Instagram. Перед тим, як голосувати, обов’язково переглянь усі заявки — там стільки натхнення!

Голосування проходитиме в цьому чат-боті 💬
Хто стане наступною зіркою нашої сцени? Обираєш саме ти!`;

// Generates the keyboard with all 10 voting buttons
function generateVotingKeyboard() {
  const keyboard = new InlineKeyboard();
  for (let i = 1; i <= 10; i++) {
    keyboard.text(`Проголосувати за Відео #${i}`, `vote:${i}`);
    // Create a new row every 2 buttons for a cleaner look
    if (i % 2 === 0) {
      keyboard.row();
    }
  }
  return keyboard;
}

// Generates the keyboard for the main menu
function generateMainMenuKeyboard() {
  return new InlineKeyboard().text(
    "Показати відео для голосування",
    "show_videos"
  );
}

// Generates the keyboard shown after a user has successfully voted
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
      // If user has voted, show the confirmation message with reset/menu buttons
      await ctx.editMessageText(
        `Ви вже проголосували за: ${existingVote[0].voted_for_id}.`,
        { reply_markup: generatePostVoteKeyboard() }
      );
    } else {
      // If user has NOT voted, show the voting dashboard
      await ctx.editMessageText(
        "Будь ласка, оберіть відео, за яке бажаєте проголосувати нижче.",
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
  // To handle the /vote command, we first send a temporary message
  // and then immediately edit it using our core logic handler.
  const tempMessage = await ctx.reply("Завантаження опцій для голосування...");
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
    // Edit the message back to the voting dashboard
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
  const videoNumber = ctx.match[1];
  const votedForId = `video_${videoNumber}`;

  try {
    await db.insert(speakerVoteTGTable).values({
      id: nanoid(),
      telegram_user_id: telegramUserId,
      voted_for_id: votedForId,
    });

    await ctx.answerCallbackQuery({ text: "Дякую! Ваш голос збережено." });

    // Edit the message to the confirmation screen
    await ctx.editMessageText(
      `✅ Проголосовано! Ви обрали ${votedForId.replace("_", " ")}.`,
      { reply_markup: generatePostVoteKeyboard() }
    );
  } catch (error) {
    console.error("Error processing vote:", error);
    await ctx.answerCallbackQuery({
      text: "Сталася помилка, або ви вже проголосували.",
      show_alert: true,
    });
  }
});

// NEW: Handler for returning to the main menu
bot.callbackQuery("main_menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME_MESSAGE, {
    reply_markup: generateMainMenuKeyboard(),
  });
});

bot.on("message:text", async (ctx) => {
  await ctx.reply("Будь ласка, використовуйте команду /start, щоб розпочати.");
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
