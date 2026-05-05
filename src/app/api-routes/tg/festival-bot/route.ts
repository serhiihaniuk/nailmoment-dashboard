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
import { db } from "@/shared/db";
import { battleVoteTGTable, telegramUsersTable } from "@/shared/db/schema";
import { nanoid } from "nanoid";
import { waitUntil } from "@vercel/functions";
import {
  BATTLE_WELCOME_1,
  BATTLE_WELCOME_2,
  BATTLE_WELCOME_3,
  FESTIVAL_BROADCAST_MESSAGES,
  FESTIVAL_CONTESTANTS,
  PARSE_MODE,
  sleep,
} from "./const";
import { readTelegramFestivalBotToken } from "@/shared/config/env";

const bot = new Bot(readTelegramFestivalBotToken());

// --- HELPERS ---

function escapeMarkdownV2(text: string): string {
  const charsToEscape = /[_\[\]()~`>#+\-=|{}.!]/g;
  return text.replace(charsToEscape, (char) => `\\${char}`);
}

function generateSliderKeyboard(
  contestantId: string,
  currentMediaIndex: number,
  totalMedia: number,
  hasVotedForThis: boolean
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard.text(
    currentMediaIndex > 0 ? "◀️" : " ",
    currentMediaIndex > 0
      ? `slide:prev:${contestantId}:${currentMediaIndex}`
      : "noop"
  );
  keyboard.text(`Медіа ${currentMediaIndex + 1}/${totalMedia}`, "noop");
  keyboard.text(
    currentMediaIndex < totalMedia - 1 ? "▶️" : " ",
    currentMediaIndex < totalMedia - 1
      ? `slide:next:${contestantId}:${currentMediaIndex}`
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
      existingVote[0]?.voted_for_contestant_id ?? null;

    await ctx.reply(
      escapeMarkdownV2(`Голосування за найкращого учасника фестивалю! 🏆`),
      { parse_mode: PARSE_MODE }
    );

    // Show all contestants - they are always available for voting
    for (const contestant of contestants) {
      if (contestant.media.length === 0) continue;
      const hasVotedForThis = contestant.id === votedForContestantId;
      const caption = escapeMarkdownV2(
        hasVotedForThis
          ? `✅ Ви вже проголосували за: ${contestant.name}`
          : `Учасник: ${contestant.name}`
      );
      const keyboard = generateSliderKeyboard(
        contestant.id,
        0,
        contestant.media.length,
        hasVotedForThis
      );
      const firstMedia = contestant.media[0];
      if (!firstMedia) continue;
      const replyOptions = {
        caption,
        reply_markup: keyboard,
        parse_mode: PARSE_MODE,
      };

      if (firstMedia.type === "photo") {
        await ctx.replyWithPhoto(firstMedia.file_id, replyOptions);
      } else if (firstMedia.type === "video") {
        await ctx.replyWithVideo(firstMedia.file_id, replyOptions);
      }
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
    parse_mode: PARSE_MODE,
  });

  await ctx.replyWithChatAction("typing");
  await sleep(2000);

  await ctx.reply(escapeMarkdownV2(BATTLE_WELCOME_2), {
    parse_mode: PARSE_MODE,
  });

  await ctx.replyWithChatAction("typing");
  await sleep(2000);

  await ctx.reply(escapeMarkdownV2(BATTLE_WELCOME_3), {
    reply_markup: generateMainMenuKeyboard(),
    parse_mode: PARSE_MODE,
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
      parse_mode: PARSE_MODE,
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
  const direction = ctx.match[1];
  const contestantId = ctx.match[2];
  const currentIndexStr = ctx.match[3];
  if (
    (direction !== "prev" && direction !== "next") ||
    !contestantId ||
    !currentIndexStr
  ) {
    return;
  }
  const currentIndex = parseInt(currentIndexStr, 10);
  
  // Find contestant from the fixed set of contestants
  const contestants = FESTIVAL_CONTESTANTS;
  const contestant = contestants.find((c) => c.id === contestantId);
  
  if (!contestant)
    return await ctx.answerCallbackQuery({
      text: "Помилка: учасника не знайдено.",
    });
  const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (newIndex < 0 || newIndex >= contestant.media.length) {
    return await ctx.answerCallbackQuery();
  }
  await ctx.answerCallbackQuery();
  // Check if user has voted for this specific contestant
  const existingVote = await db
    .select()
    .from(battleVoteTGTable)
    .where(eq(battleVoteTGTable.telegram_user_id, ctx.from.id))
    .limit(1);
  
  const hasVotedForThis =
    existingVote[0]?.voted_for_contestant_id === contestantId;
  const newCaption = escapeMarkdownV2(
    hasVotedForThis
      ? `✅ Ви вже проголосували за: ${contestant.name}`
      : `Учасник: ${contestant.name}`
  );
  const newKeyboard = generateSliderKeyboard(
    contestantId,
    newIndex,
    contestant.media.length,
    hasVotedForThis
  );
  const newMediaItem = contestant.media[newIndex];
  if (!newMediaItem) return await ctx.answerCallbackQuery();


  const commonProps = {
    caption: newCaption,
    parse_mode: PARSE_MODE,
  };

  if (newMediaItem.type === "photo") {
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: newMediaItem.file_id,
        ...commonProps,
      },
      { reply_markup: newKeyboard }
    );
  } else if (newMediaItem.type === "video") {
    await ctx.editMessageMedia(
      {
        type: "video",
        media: newMediaItem.file_id,
        ...commonProps,
      },
      { reply_markup: newKeyboard }
    );
  }
});

bot.callbackQuery(/^vote:(.+)$/, async (ctx) => {

  if (!ctx.from) return;
  const contestantId = ctx.match[1];
  if (!contestantId) return;
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
  await ctx.answerCallbackQuery();
  
  
  try {
    await db.insert(battleVoteTGTable).values({
      id: nanoid(),
      telegram_user_id: telegramUserId,
      category_id: "festival", // Fixed category ID for festival voting
      voted_for_contestant_id: contestantId,
    });

    const buttonText =
      ctx.callbackQuery.message?.reply_markup?.inline_keyboard[0]?.[1]?.text ||
      "Медіа 1/";
    const match = buttonText.match(/Медіа (\d+)\//);
    const currentMediaIndex = match?.[1] ? parseInt(match[1], 10) - 1 : 0;
    const newKeyboard = generateSliderKeyboard(
      contestant.id,
      currentMediaIndex,
      contestant.media.length,
      true
    );
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(
        `✅ Проголосовано! Ви обрали: ${contestant.name}`
      ),
      reply_markup: newKeyboard,
      parse_mode: PARSE_MODE,
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
  if (!contestantId) return;
  const telegramUserId = ctx.from.id;
  
  // Find contestant from the fixed set of contestants
  const contestants = FESTIVAL_CONTESTANTS;
  const contestant = contestants.find((c) => c.id === contestantId);

  if (!contestant) return;

  try {
    await db
      .delete(battleVoteTGTable)
      .where(eq(battleVoteTGTable.telegram_user_id, telegramUserId));
      
    const newKeyboard = generateSliderKeyboard(
      contestant.id,
      0,
      contestant.media.length,
      false
    );
    const firstMediaItem = contestant.media[0];
    if (!firstMediaItem) return;
    
    const commonProps = {
        caption: escapeMarkdownV2(`Учасник: ${contestant.name}`),
        parse_mode: PARSE_MODE,
    };

    if (firstMediaItem.type === 'photo') {
        await ctx.editMessageMedia({
            type: 'photo',
            media: firstMediaItem.file_id,
            ...commonProps,
        }, { reply_markup: newKeyboard });
    } else if (firstMediaItem.type === 'video') {
        await ctx.editMessageMedia({
            type: 'video',
            media: firstMediaItem.file_id,
            ...commonProps,
        }, { reply_markup: newKeyboard });
    }
    
  } catch (error) {
    console.error("Error resetting vote:", error);
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

    // Fetch candidate users who haven't been contacted recently to prevent race conditions on Vercel
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
        "No eligible users found to send the broadcast to (all recently contacted)."
      );
    }

    const messageText = escapeMarkdownV2(messageToSend.text);
    const options: Parameters<typeof bot.api.sendMessage>[2] = {
      parse_mode: PARSE_MODE,
    };
    if (messageToSend.button) {
      const keyboard = new InlineKeyboard();
      if ("url" in messageToSend.button && messageToSend.button.url) {
        keyboard.url(messageToSend.button.text, messageToSend.button.url);
      } else if ("callback_data" in messageToSend.button) {
        keyboard.text(
          messageToSend.button.text,
          messageToSend.button.callback_data
        );
      }
      options.reply_markup = keyboard;
    }

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const user of candidateUsers) {
      try {
        // Perform the ATOMIC "claim and update" operation.
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
      await sleep(50); // Sleep to avoid hitting rate limits
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
  if (!photo) return;

  const fileId = photo.file_id;
  const safeText = escapeMarkdownV2(`Отримано фото. \n\nВаш file_id: `);
  await ctx.reply(`${safeText}\`${fileId}\``, { parse_mode: "MarkdownV2" });
});

bot.on("message:video", async (ctx) => {
  const video = ctx.message.video;
  const fileId = video.file_id;
  const safeText = escapeMarkdownV2(`Отримано відео. \n\nВаш file_id: `);
  await ctx.reply(`${safeText}\`${fileId}\``, { parse_mode: "MarkdownV2" });
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
