// src/app/api/bot/route.ts

import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { db } from "@/shared/db";
import { speakerVoteTGTable } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const token = process.env.TG_BOT;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

async function sendVotingOptions(ctx: Context) {
  await ctx.reply("Please choose a video to vote for below.");
  for (let i = 1; i <= 10; i++) {
    const inlineKeyboard = new InlineKeyboard().text(
      "Vote for this one 👍",
      `vote:${i}`
    );
    await ctx.reply(`This is Video #${i}`, {
      reply_markup: inlineKeyboard,
    });
  }
}

bot.command("start", async (ctx) => {
  if (!ctx?.from) return;

  const telegramUserId = ctx.from.id;

  try {
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    if (existingVote.length > 0) {
      // User has voted. Offer them the option to reset their vote.
      const resetKeyboard = new InlineKeyboard().text(
        "Reset my Vote 🔄",
        "reset_vote" // A new, unique callback data string
      );

      await ctx.reply(
        `You have already voted for: ${existingVote[0].voted_for_id}. Would you like to change your vote?`,
        { reply_markup: resetKeyboard }
      );
    } else {
      // This is a new user, show them the voting options directly.
      await sendVotingOptions(ctx);
    }
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply(
      "Sorry, a database error occurred. Please try again later."
    );
  }
});

// NEW: Handler for the "Reset Vote" button
bot.callbackQuery("reset_vote", async (ctx) => {
  const telegramUserId = ctx.from.id;

  try {
    // Delete the user's previous vote from the database.
    await db
      .delete(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId));

    // Confirm the deletion to the user.
    await ctx.answerCallbackQuery({ text: "Your vote has been reset!" });

    // Edit the message to remove the "Reset" button and confirm the action.
    await ctx.editMessageText("Your previous vote has been cleared.");

    // Immediately present the voting options again.
    await sendVotingOptions(ctx);
  } catch (error) {
    console.error("Error resetting vote:", error);
    await ctx.answerCallbackQuery({
      text: "An error occurred while resetting your vote.",
      show_alert: true,
    });
  }
});

// Handler for casting a new vote (remains mostly the same)
bot.callbackQuery(/^vote:(\d+)$/, async (ctx) => {
  const telegramUserId = ctx.from.id;
  const videoNumber = ctx.match[1];
  const votedForId = `video_${videoNumber}`;

  try {
    // This check is still useful in case the user finds an old voting button.
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    if (existingVote.length > 0) {
      await ctx.answerCallbackQuery({
        text: "You have already voted. Please use /start to reset your vote.",
      });
      return;
    }

    await db.insert(speakerVoteTGTable).values({
      id: nanoid(),
      telegram_user_id: telegramUserId,
      voted_for_id: votedForId,
    });

    await ctx.answerCallbackQuery({ text: "Thank you! Your vote is saved." });
    await ctx.editMessageText(
      `✅ Voted! You chose ${votedForId.replace("_", " ")}.`
    );
  } catch (error) {
    console.error("Error processing vote:", error);
    await ctx.answerCallbackQuery({
      text: "An error occurred, or you have already voted.",
      show_alert: true,
    });
  }
});

bot.on("message:text", async (ctx) => {
  await ctx.reply("Please use the /start command to begin voting.");
});

// --- WEBHOOK SETUP ---
export const POST = webhookCallback(bot, "std/http");
