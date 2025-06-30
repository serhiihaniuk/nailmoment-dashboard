// src/app/api/bot/route.ts

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
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { BATTLE_CATEGORIES } from "@/shared/const";

const token = process.env.TG_BOT;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

// --- CONSTANTS & HELPERS ---
const BATTLE_WELCOME_1 = `👋 Привіт! Я — чат-бот, який допоможе визначити переможця конкурсу «Битва майстрів», що проходить у межах манікюрного фестивалю Nail Moment.
Ми готуємо справжню nail-битву — з відбором, народним голосуванням і гучним фіналом на сцені фестивалю!`;

const BATTLE_WELCOME_2 = `Наш конкурс розділений на два етапи та 6 номінацій. На першому етапі ми вибираємо трьох учасників з кожної номінації, які продовжать боротьбу у фіналі на майданчику Nail-фестивалю Nail Moment у Вроцлаві 27 липня 2025 року.`;

const BATTLE_WELCOME_3 = `Детальні умови конкурсу та список номінацій ви можете переглянути на нашому офіційному сайті.`;

// NEW: Constant for the voting schedule text
const VOTING_SCHEDULE_MESSAGE = `Графік голосування 🗳️:

Френч
Старт голосування: 1 липня о 12:00
Завершення голосування: 2 липня о 12:00
Оголошення фіналістів: 2 липня о 21:00

3D-дизайн / Korean Style
Старт голосування: 3 липня о 12:00
Завершення голосування: 4 липня о 12:00
Оголошення фіналістів: 4 липня о 21:00

Неоновий манікюр
Старт голосування: 5 липня о 12:00
Завершення голосування: 6 липня о 12:00
Оголошення фіналістів: 6 липня о 21:00

Градієнт
Старт голосування: 7 липня о 12:00
Завершення голосування: 8 липня о 12:00
Оголошення фіналістів: 8 липня о 21:00

Однотонний манікюр
Старт голосування: 9 липня о 12:00
Завершення голосування: 10 липня о 12:00
Оголошення фіналістів: 10 липня о 21:00

Екстремальна довжина
Старт голосування: 11 липня о 12:00
Завершення голосування: 12 липня о 12:00
Оголошення фіналістів: 12 липня о 21:00`;

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

// NEW: Helper function to generate the main menu keyboard
function generateMainMenuKeyboard() {
  return new InlineKeyboard()
    .text("📌 Перейти до голосування", "show_votes")
    .row()
    .text("🗓️ Подивитися графік голосування", "show_schedule") // New button
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
    const activeCategory = BATTLE_CATEGORIES.find((cat) => cat.isActive);
    if (!activeCategory || activeCategory.contestants.length === 0) {
      await ctx.reply(
        "Наразі немає активних голосувань. Слідкуйте за оновленнями!"
      );
      return;
    }
    const existingVote = await db
      .select()
      .from(battleVoteTGTable)
      .where(
        and(
          eq(battleVoteTGTable.telegram_user_id, telegramUserId),
          eq(battleVoteTGTable.category_id, activeCategory.id)
        )
      )
      .limit(1);
    const votedForContestantId =
      existingVote.length > 0 ? existingVote[0].voted_for_contestant_id : null;
    await ctx.reply(
      escapeMarkdownV2(`Голосування в категорії: *${activeCategory.name}*`),
      { parse_mode: "MarkdownV2" }
    );
    for (const contestant of activeCategory.contestants) {
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
    reply_markup: generateMainMenuKeyboard(), // Use the helper function
    parse_mode: "MarkdownV2",
  });
});

bot.command("reset", async (ctx) => {
  if (!ctx.from) return;
  const telegramUserId = ctx.from.id;
  try {
    const activeCategory = BATTLE_CATEGORIES.find((cat) => cat.isActive);
    if (!activeCategory) {
      return await ctx.reply("Наразі немає активних голосувань для скидання.");
    }
    const existingVote = await db
      .select()
      .from(battleVoteTGTable)
      .where(
        and(
          eq(battleVoteTGTable.telegram_user_id, telegramUserId),
          eq(battleVoteTGTable.category_id, activeCategory.id)
        )
      )
      .limit(1);
    let replyMessage: string;
    if (existingVote.length > 0) {
      await db
        .delete(battleVoteTGTable)
        .where(
          and(
            eq(battleVoteTGTable.telegram_user_id, telegramUserId),
            eq(battleVoteTGTable.category_id, activeCategory.id)
          )
        );
      replyMessage = `Ваш голос в категорії *"${activeCategory.name}"* було видалено. Тепер ви можете голосувати знову.`;
    } else {
      replyMessage = `У вас немає активного голосу в категорії *"${activeCategory.name}"*, який можна було б скинути.`;
    }
    const showVotesKeyboard = new InlineKeyboard().text(
      "Показати роботи для голосування",
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

// NEW: Handler for the schedule button
bot.callbackQuery("show_schedule", async (ctx) => {
  if (!ctx.from) return;
  await ctx.answerCallbackQuery();

  const backButton = new InlineKeyboard().text(
    "◀️ Назад до головного меню",
    "main_menu"
  );

  await ctx.editMessageText(escapeMarkdownV2(VOTING_SCHEDULE_MESSAGE), {
    parse_mode: "MarkdownV2",
    reply_markup: backButton,
  });
});

// NEW: Handler for the "Back to Main Menu" button
bot.callbackQuery("main_menu", async (ctx) => {
  if (!ctx.from) return;
  await ctx.answerCallbackQuery();

  await ctx.editMessageText(escapeMarkdownV2(BATTLE_WELCOME_3), {
    reply_markup: generateMainMenuKeyboard(),
    parse_mode: "MarkdownV2",
  });
});

bot.callbackQuery(/^slide:(prev|next):(.+):(\d+)$/, async (ctx) => {
  if (!ctx.from) return;
  const [, direction, contestantId, currentIndexStr] = ctx.match;
  const currentIndex = parseInt(currentIndexStr, 10);
  const activeCategory = BATTLE_CATEGORIES.find((cat) => cat.isActive);
  const contestant = activeCategory?.contestants.find(
    (c) => c.id === contestantId
  );
  if (!contestant)
    return await ctx.answerCallbackQuery({
      text: "Помилка: учасника не знайдено.",
    });
  const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (newIndex < 0 || newIndex >= contestant.photo_file_ids.length) {
    return await ctx.answerCallbackQuery();
  }
  const existingVote = await db
    .select()
    .from(battleVoteTGTable)
    .where(
      and(
        eq(battleVoteTGTable.telegram_user_id, ctx.from.id),
        eq(battleVoteTGTable.category_id, activeCategory!.id)
      )
    )
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
  if (!ctx.from) return;
  const contestantId = ctx.match[1];
  const telegramUserId = ctx.from.id;
  const activeCategory = BATTLE_CATEGORIES.find((cat) => cat.isActive)!;
  const contestant = activeCategory.contestants.find(
    (c) => c.id === contestantId
  )!;
  const existingVote = await db
    .select()
    .from(battleVoteTGTable)
    .where(
      and(
        eq(battleVoteTGTable.telegram_user_id, telegramUserId),
        eq(battleVoteTGTable.category_id, activeCategory.id)
      )
    )
    .limit(1);
  if (existingVote.length > 0) {
    return await ctx.answerCallbackQuery({
      text: "Ви вже проголосували в цій категорії. Спочатку скиньте свій голос.",
    });
  }
  try {
    await db.insert(battleVoteTGTable).values({
      id: nanoid(),
      telegram_user_id: telegramUserId,
      category_id: activeCategory.id,
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
  if (!ctx.from) return;
  const contestantId = ctx.match[1];
  const telegramUserId = ctx.from.id;
  const activeCategory = BATTLE_CATEGORIES.find((cat) => cat.isActive)!;
  const contestant = activeCategory.contestants.find(
    (c) => c.id === contestantId
  )!;
  try {
    await db
      .delete(battleVoteTGTable)
      .where(
        and(
          eq(battleVoteTGTable.telegram_user_id, telegramUserId),
          eq(battleVoteTGTable.category_id, activeCategory.id)
        )
      );
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

  // For now, we hardcode the admin ID to restrict usage.
  const ADMIN_ID = 299445418;
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("You are not authorized to use this command.");
  }

  // Hardcode the target user ID and the test message.
  const targetUserId = 299445418;
  const testMessage = "This is a test push message sent from the bot server!";

  try {
    // Use bot.api.sendMessage to send a message to a specific chat ID.
    await bot.api.sendMessage(targetUserId, testMessage);

    // Confirm to the admin that the message was sent.
    await ctx.reply(
      `Successfully sent the test message to user ID: ${targetUserId}`
    );
  } catch (error) {
    console.error(`Failed to send message to ${targetUserId}:`, error);
    if (error instanceof GrammyError && error.error_code === 403) {
      await ctx.reply(`Failed: User ${targetUserId} has blocked the bot.`);
    } else {
      await ctx.reply("An error occurred while trying to send the message.");
    }
  }
});

bot.on("message:photo", async (ctx) => {
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;
  const safeText = escapeMarkdownV2(`Отримано фото. \n\nВаш file_id: `);
  await ctx.reply(`${safeText}\`${fileId}\``, { parse_mode: "MarkdownV2" });
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
