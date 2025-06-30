import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import type { InputMediaPhoto } from "@grammyjs/types";
import { db } from "@/shared/db";
import { battleVoteTGTable, telegramUsersTable } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { BATTLE_CATEGORIES } from "@/shared/const";

const token = process.env.TG_BOT;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

const WELCOME_MESSAGE_PART_1 = `Привіт! Я — бот Nail Moment... (full message)`;
const WELCOME_MESSAGE_PART_2 = `📹 Відеопрезентації учасників уже доступні!... (full message)`;

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

// --- BOT COMMANDS & CALLBACKS ---

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

  const showVotesKeyboard = new InlineKeyboard().text(
    "Показати роботи для голосування",
    "show_votes"
  );
  await ctx.reply(escapeMarkdownV2(WELCOME_MESSAGE_PART_1), {
    parse_mode: "MarkdownV2",
  });
  await ctx.reply(escapeMarkdownV2(WELCOME_MESSAGE_PART_2), {
    reply_markup: showVotesKeyboard,
    parse_mode: "MarkdownV2",
  });
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

    // --- THIS IS THE FIX ---
    // Access the message via ctx.callbackQuery.message, not ctx.message
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
    await ctx.editMessageReplyMarkup({ reply_markup: newKeyboard });
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(
        `✅ Проголосовано! Ви обрали: ${contestant.name}`
      ),
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

    // --- THIS IS THE FIX ---
    // Access the message via ctx.callbackQuery.message, not ctx.message
    const buttonText =
      ctx.callbackQuery.message?.reply_markup?.inline_keyboard[0][1]?.text ||
      "Фото 1/";
    const match = buttonText.match(/Фото (\d+)\//);
    const currentPhotoIndex = match ? parseInt(match[1], 10) - 1 : 0;

    const newKeyboard = generateSliderKeyboard(
      contestant.id,
      currentPhotoIndex,
      contestant.photo_file_ids.length,
      false
    );
    await ctx.editMessageReplyMarkup({ reply_markup: newKeyboard });
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(`Учасник: ${contestant.name}`),
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

bot.on("message:photo", async (ctx) => {
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;
  const safeText = escapeMarkdownV2(`Отримано фото. \n\nВаш file_id: `);
  await ctx.reply(`${safeText}\`${fileId}\``, { parse_mode: "MarkdownV2" });
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
