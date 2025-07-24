// src/app/api/festival-bot/route.ts
// Festival bot - has ONE fixed set of contestants always available for voting (no active/inactive categories)
import { eq, and, or, isNull, lt } from "drizzle-orm";
import {
  Bot,
  Context,
  GrammyError,
  InlineKeyboard,
  webhookCallback,
} from "grammy";
import type { InputMediaPhoto } from "@grammyjs/types";
import { db } from "@/shared/db";
import { battleVoteTGTable, telegramUsersTable } from "@/shared/db/schema";
import { nanoid } from "nanoid";
import { waitUntil } from "@vercel/functions";

const token = process.env.TG_FESTIVAL_BOT;
if (!token) throw new Error("TG_FESTIVAL_BOT is unset");

const bot = new Bot(token);

// --- FESTIVAL-SPECIFIC CONSTANTS ---

const FESTIVAL_CONTESTANTS = [
  {
    id: "mock-contestant-1",
    name: "Mock Speaker 1",
    photo_file_ids: [
      "AgACAgIAAxkBAAMOaIJsaUnyOfl_ZWOkKEC1RpjFSv4AAnbxMRsK8hlIiETYpXwE0lsBAAMCAAN4AAM2BA",
      "AgACAgIAAxkBAAMOaIJsaUnyOfl_ZWOkKEC1RpjFSv4AAnbxMRsK8hlIiETYpXwE0lsBAAMCAAN4AAM2BA",
    ],
  },
  {
    id: "mock-contestant-2",
    name: "Mock Speaker 2",
    photo_file_ids: [
      "AgACAgIAAxkBAAMOaIJsaUnyOfl_ZWOkKEC1RpjFSv4AAnbxMRsK8hlIiETYpXwE0lsBAAMCAAN4AAM2BA",
    ],
  },
  {
    id: "mock-contestant-3",
    name: "Mock Speaker 3",
    photo_file_ids: [
      "AgACAgIAAxkBAAMOaIJsaUnyOfl_ZWOkKEC1RpjFSv4AAnbxMRsK8hlIiETYpXwE0lsBAAMCAAN4AAM2BA",
    ],
  },
];

const FESTIVAL_BROADCAST_MESSAGES = [
    {
        id: "welcome_broadcast",
        text: "👋 Привіт! Нагадуємо, що голосування за найкращу роботу триває! Ваш голос може стати вирішальним!",
        button: {
            text: "Проголосувати зараз",
            callback_data: "show_votes"
        }
    },
    {
        id: "last_call_broadcast",
        text: "❗️Залишилось зовсім мало часу, щоб віддати свій голос! Поспішайте, голосування скоро завершиться!",
        button: {
            text: "Віддати свій голос",
            callback_data: "show_votes"
        }
    }
];


// --- CONSTANTS & HELPERS ---
const BATTLE_WELCOME_1 = `👋 Привіт! Я — чат-бот, який допоможе визначити переможця конкурсу «Битва майстрів», що проходить у межах манікюрного фестивалю Nail Moment.

І зараз пару слів від організаторів:`;

const BATTLE_WELCOME_2 = `Привіт, наші неіл-майстри! ☺️
Ми раді вітати вас на фестивалі Nail Moment  — дякуємо, що ви з нами сьогодні 💛

Учасники конкурсу «Битва майстрів» вже завершили свої роботи.
Було спекотно, емоційно й дуже красиво!

І вже прямо зараз ми готові представити вашій увазі всі конкурсні роботи.
Голосування відкрито з цього моменту й триватиме до 19:00.
Тож не зволікайте — подивіться всі роботи та оберіть найкращу 🔥

🏆 Що стоїть на кону:
– Кубок переможця Битви Майстрів
– Грошовий приз у розмірі 2000 злотих
- Ціла валіза з матеріалами на сумму 2000 зл від партнера Битви Майстрів компанії Edlen 🩷
– Цінні подарунки від партнерів фестивалю
– І, звісно, гучне визнання на головній сцені Nail Moment!`;

const BATTLE_WELCOME_3 = `Нагадуємо:
Ви можете віддати лише 1 голос — за того учасника, якого вважаєте гідним перемоги.

Голосування проводять тільки учасники фестивалю, тож саме ви вирішуєте, хто отримає кубок!

Обирайте серцем і голосуйте за роботу, яка справді вразила 💥`;

function escapeMarkdownV2(text: string): string {
  const charsToEscape = /[_\[\]()~`>#+\-=|{}.!]/g;
  return text.replace(charsToEscape, (char) => `\\${char}`);
}

function generateSliderKeyboard(
  contestantId: string,
  currentPhotoIndex: number,
  totalPhotos: number,
  hasVotedForThis: boolean
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard.text(
    currentPhotoIndex > 0 ? "◀️" : " ",
    currentPhotoIndex > 0
      ? `slide:prev:${contestantId}:${currentPhotoIndex}`
      : "noop"
  );
  keyboard.text(`Фото ${currentPhotoIndex + 1}/${totalPhotos}`, "noop");
  keyboard.text(
    currentPhotoIndex < totalPhotos - 1 ? "▶️" : " ",
    currentPhotoIndex < totalPhotos - 1
      ? `slide:next:${contestantId}:${currentPhotoIndex}`
      : "noop"
  );
  keyboard.row();
  if (hasVotedForThis) {
    keyboard.text("Скинути мій голос 🔄", `reset_vote:${contestantId}`);
  } else {
    keyboard.text("Проголосувати за цього учасника 👍", `vote:${contestantId}`);
  }
  return keyboard;
}

// Helper function to generate the main menu keyboard for festival voting
function generateMainMenuKeyboard() {
  return new InlineKeyboard()
    .text("📌 Переглянути учасників та проголосувати", "show_votes")
    .row()
    .url(
      "🌐 Перейти на сайт конкурсу «Битва майстрів»",
      "https://www.nailmoment.pl/"
    );
}

// --- CORE LOGIC ---
async function initiateVotingFlow(ctx: Context) {
  if (!ctx.from) return;
  const telegramUserId = ctx.from.id;
  try {
    // Festival bot has ONE fixed set of contestants always available for voting
    // No concept of active/inactive categories - contestants are always available from bot start
    const contestants = FESTIVAL_CONTESTANTS;
    if (contestants.length === 0) {
      await ctx.reply(
        "Учасники ще не додані. Слідкуйте за оновленнями!"
      );
      return;
    }

    // Check if user has already voted for any contestant
    const existingVote = await db
      .select()
      .from(battleVoteTGTable)
      .where(eq(battleVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);
    
    const votedForContestantId =
      existingVote.length > 0 ? existingVote[0].voted_for_contestant_id : null;

    await ctx.reply(
      escapeMarkdownV2(`Голосування за найкращого учасника фестивалю! 🏆`),
      { parse_mode: "MarkdownV2" }
    );

    // Show all contestants - they are always available for voting
    for (const contestant of contestants) {
      if (contestant.photo_file_ids.length === 0) continue;
      const hasVotedForThis = contestant.id === votedForContestantId;
      const caption = escapeMarkdownV2(
        hasVotedForThis
          ? `✅ Ви вже проголосували за: ${contestant.name}`
          : `Учасник: ${contestant.name}`
      );
      const keyboard = generateSliderKeyboard(
        contestant.id,
        0,
        contestant.photo_file_ids.length,
        hasVotedForThis
      );
      await ctx.replyWithPhoto(contestant.photo_file_ids[0], {
        caption,
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
  if (!ctx.from) return;
  try {
    await db
      .insert(telegramUsersTable)
      .values({
        telegramUserId: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("Failed to save user:", error);
  }

  await ctx.reply(escapeMarkdownV2(BATTLE_WELCOME_1), {
    parse_mode: "MarkdownV2",
  });
  await ctx.reply(escapeMarkdownV2(BATTLE_WELCOME_2), {
    parse_mode: "MarkdownV2",
  });
  await ctx.reply(escapeMarkdownV2(BATTLE_WELCOME_3), {
    reply_markup: generateMainMenuKeyboard(),
    parse_mode: "MarkdownV2",
  });
});

bot.command("reset", async (ctx) => {
  if (!ctx.from) return;
  const telegramUserId = ctx.from.id;
  try {
    const existingVote = await db
      .select()
      .from(battleVoteTGTable)
      .where(eq(battleVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);
    
    let replyMessage: string;
    if (existingVote.length > 0) {
      await db
        .delete(battleVoteTGTable)
        .where(eq(battleVoteTGTable.telegram_user_id, telegramUserId));
      
      replyMessage = `Ваш голос було видалено. Тепер ви можете голосувати знову.`;
    } else {
      replyMessage = `У вас немає активного голосу для скидання.`;
    }
    
    const showVotesKeyboard = new InlineKeyboard().text(
      "Переглянути учасників та проголосувати",
      "show_votes"
    );
    await ctx.reply(escapeMarkdownV2(replyMessage), {
      reply_markup: showVotesKeyboard,
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    console.error("Error in /reset command:", error);
    await ctx.reply("Вибачте, сталася помилка під час скидання вашого голосу.");
  }
});

bot.callbackQuery("show_votes", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup();
  await initiateVotingFlow(ctx);
});

bot.callbackQuery(/^slide:(prev|next):(.+):(\d+)$/, async (ctx) => {
  if (!ctx.from) return;
  const [, direction, contestantId, currentIndexStr] = ctx.match;
  const currentIndex = parseInt(currentIndexStr, 10);
  
  // Find contestant from the fixed set of contestants
  const contestants = FESTIVAL_CONTESTANTS;
  const contestant = contestants.find((c) => c.id === contestantId);
  
  if (!contestant)
    return await ctx.answerCallbackQuery({
      text: "Помилка: учасника не знайдено.",
    });
  const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (newIndex < 0 || newIndex >= contestant.photo_file_ids.length) {
    return await ctx.answerCallbackQuery();
  }
  
  // Check if user has voted for this specific contestant
  const existingVote = await db
    .select()
    .from(battleVoteTGTable)
    .where(eq(battleVoteTGTable.telegram_user_id, ctx.from.id))
    .limit(1);
  
  const hasVotedForThis =
    existingVote.length > 0 &&
    existingVote[0].voted_for_contestant_id === contestantId;
  const newCaption = escapeMarkdownV2(
    hasVotedForThis
      ? `✅ Ви вже проголосували за: ${contestant.name}`
      : `Учасник: ${contestant.name}`
  );
  const newKeyboard = generateSliderKeyboard(
    contestantId,
    newIndex,
    contestant.photo_file_ids.length,
    hasVotedForThis
  );
  const newPhoto: InputMediaPhoto<string> = {
    type: "photo",
    media: contestant.photo_file_ids[newIndex],
    caption: newCaption,
    parse_mode: "MarkdownV2",
  };
  await ctx.answerCallbackQuery();
  await ctx.editMessageMedia(newPhoto, { reply_markup: newKeyboard });
});

bot.callbackQuery(/^vote:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (!ctx.from) return;
  const contestantId = ctx.match[1];
  const telegramUserId = ctx.from.id;
  
  // Find contestant from the fixed set of contestants
  const contestants = FESTIVAL_CONTESTANTS;
  const contestant = contestants.find((c) => c.id === contestantId);

  if (!contestant) return;

  // Check if user has already voted for any contestant
  const existingVote = await db
    .select()
    .from(battleVoteTGTable)
    .where(eq(battleVoteTGTable.telegram_user_id, telegramUserId))
    .limit(1);
  
  if (existingVote.length > 0) {
    return await ctx.answerCallbackQuery({
      text: "Ви вже проголосували. Спочатку скиньте свій голос.",
    });
  }
  
  try {
    await db.insert(battleVoteTGTable).values({
      id: nanoid(),
      telegram_user_id: telegramUserId,
      category_id: "festival", // Fixed category ID for festival voting
      voted_for_contestant_id: contestantId,
    });
    await ctx.answerCallbackQuery({ text: "Дякую! Ваш голос збережено." });
    const buttonText =
      ctx.callbackQuery.message?.reply_markup?.inline_keyboard[0][1]?.text ||
      "Фото 1/";
    const match = buttonText.match(/Фото (\d+)\//);
    const currentPhotoIndex = match ? parseInt(match[1], 10) - 1 : 0;
    const newKeyboard = generateSliderKeyboard(
      contestant.id,
      currentPhotoIndex,
      contestant.photo_file_ids.length,
      true
    );
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(
        `✅ Проголосовано! Ви обрали: ${contestant.name}`
      ),
      reply_markup: newKeyboard,
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    console.error("Error processing vote:", error);
    await ctx.answerCallbackQuery({
      text: "Сталася помилка. Спробуйте ще раз.",
      show_alert: true,
    });
  }
});

bot.callbackQuery(/^reset_vote:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (!ctx.from) return;
  const contestantId = ctx.match[1];
  const telegramUserId = ctx.from.id;
  
  // Find contestant from the fixed set of contestants
  const contestants = FESTIVAL_CONTESTANTS;
  const contestant = contestants.find((c) => c.id === contestantId);

  if (!contestant) return;

  try {
    await db
      .delete(battleVoteTGTable)
      .where(eq(battleVoteTGTable.telegram_user_id, telegramUserId));
      
    await ctx.answerCallbackQuery({ text: "Ваш голос скинуто!" });
    const newKeyboard = generateSliderKeyboard(
      contestant.id,
      0,
      contestant.photo_file_ids.length,
      false
    );
    const firstPhoto: InputMediaPhoto<string> = {
      type: "photo",
      media: contestant.photo_file_ids[0],
      caption: escapeMarkdownV2(`Учасник: ${contestant.name}`),
      parse_mode: "MarkdownV2",
    };
    await ctx.editMessageMedia(firstPhoto, { reply_markup: newKeyboard });
  } catch (error) {
    console.error("Error resetting vote:", error);
    await ctx.answerCallbackQuery({
      text: "Помилка під час скидання голосу.",
      show_alert: true,
    });
  }
});

bot.command("send_message", async (ctx) => {
  if (!ctx.from) return;

  const ADMIN_ID = 299445418;
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("You are not authorized to use this command.");
  }

  await ctx.reply(
    "✅ Command received. Starting broadcast with atomic updates. I will notify you when it's complete."
  );

  const runBroadcast = async () => {
    const messageId = ctx.match;
    if (!messageId) {
      return bot.api.sendMessage(ADMIN_ID, "Error: No message ID provided.");
    }
    const messageToSend = FESTIVAL_BROADCAST_MESSAGES.find((m) => m.id === messageId);
    if (!messageToSend) {
      return bot.api.sendMessage(
        ADMIN_ID,
        `Error: Message with ID "${messageId}" not found.`
      );
    }

    // 1. Fetch an initial list of POTENTIAL candidates to reduce loop size.
    // This is still a good optimization.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const candidateUsers = await db
      .select({ telegramUserId: telegramUsersTable.telegramUserId })
      .from(telegramUsersTable)
      .where(
        and(
          eq(telegramUsersTable.isActive, true),
          or(
            isNull(telegramUsersTable.lastBroadcastSentAt),
            lt(telegramUsersTable.lastBroadcastSentAt, fiveMinutesAgo)
          )
        )
      );

    if (candidateUsers.length === 0) {
      return bot.api.sendMessage(
        ADMIN_ID,
        "No eligible users found (all recently contacted)."
      );
    }

    let messageText = messageToSend.text;
    // Festival bot has simpler message templating - just basic date replacements
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const startDate = `${today.getDate()} липня`;
    const endDate = `${tomorrow.getDate()} липня`;
    messageText = messageToSend.text
      .replace("{categoryName}", "Фестиваль")
      .replace("{date}", startDate)
      .replace("{endDate}", endDate);

    const options: Parameters<typeof bot.api.sendMessage>[2] = {};
    if (messageToSend.button) {
      // Festival bot broadcast messages only use callback_data buttons, so this is simplified.
      const keyboard = new InlineKeyboard().text(
        messageToSend.button.text,
        messageToSend.button.callback_data
      );
      options.reply_markup = keyboard;
    }

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const user of candidateUsers) {
      try {
        // 2. Perform the ATOMIC "claim and update" operation.
        const updatedRows = await db
          .update(telegramUsersTable)
          .set({ lastBroadcastSentAt: new Date() })
          .where(
            and(
              eq(telegramUsersTable.telegramUserId, user.telegramUserId),
              or(
                isNull(telegramUsersTable.lastBroadcastSentAt),
                lt(telegramUsersTable.lastBroadcastSentAt, fiveMinutesAgo)
              )
            )
          )
          .returning({ id: telegramUsersTable.telegramUserId }); // Ask DB to return the row if update was successful

        if (updatedRows.length > 0) {
          await bot.api.sendMessage(user.telegramUserId, messageText, options);
          successCount++;
        } else {
          skippedCount++;
          console.log(
            `Skipped user ${user.telegramUserId} as they were recently contacted by another process.`
          );
        }
      } catch (error) {
        failureCount++;
        console.error(`Failed to process user ${user.telegramUserId}:`, error);
        if (error instanceof GrammyError && error.error_code === 403) {
          await db
            .update(telegramUsersTable)
            .set({ isActive: false })
            .where(eq(telegramUsersTable.telegramUserId, user.telegramUserId));
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    await bot.api.sendMessage(
      ADMIN_ID,
      `Broadcast finished.\n\nSuccessfully sent: ${successCount}\nSkipped (already sent): ${skippedCount}\nFailed: ${failureCount}.`
    );
  };

  waitUntil(
    runBroadcast().catch((err) => {
      console.error("Critical error in broadcast background task:", err);
      bot.api.sendMessage(
        ADMIN_ID,
        "A critical error occurred during the broadcast. Check the server logs."
      );
    })
  );
});

bot.on("message:photo", async (ctx) => {
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;
  const safeText = escapeMarkdownV2(`Отримано фото. \n\nВаш file_id: `);
  await ctx.reply(`${safeText}\`${fileId}\``, { parse_mode: "MarkdownV2" });
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
