import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { db } from "@/shared/db"; // Import your Drizzle instance
import { speakerVoteTGTable } from "@/shared/db/schema"; // Import your table schema
import { eq } from "drizzle-orm"; // Import the 'eq' operator for queries
import { nanoid } from "nanoid"; // Used to generate unique IDs for the 'id' column

const token = process.env.TG_BOT;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

/**
 * Handles the /start command.
 * It now checks the database before sending voting options.
 */
bot.command("start", async (ctx) => {
  if (!ctx?.from) return;

  const telegramUserId = ctx.from.id;

  try {
    // 1. Check if the user has already voted.
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    // 2. If a vote record exists, inform the user and stop.
    if (existingVote.length > 0) {
      await ctx.reply(
        `You have already voted for: ${existingVote[0].voted_for_id}. Thank you!`
      );
      return;
    }

    // 3. If no vote exists, proceed to show the voting options.
    await ctx.reply("Welcome! Please choose a video to vote for below.");

    for (let i = 1; i <= 10; i++) {
      const inlineKeyboard = new InlineKeyboard().text(
        "Vote for this one 👍",
        `vote:${i}`
      );
      await ctx.reply(`This is Video #${i}`, {
        reply_markup: inlineKeyboard,
      });
    }
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply(
      "Sorry, a database error occurred. Please try again later."
    );
  }
});

/**
 * Handles the button click (callback query).
 * This is where the vote is written to the database.
 */
bot.callbackQuery(/^vote:(\d+)$/, async (ctx) => {
  const telegramUserId = ctx.from.id;
  const videoNumber = ctx.match[1];
  const votedForId = `video_${videoNumber}`; // A descriptive ID like "video_7"

  try {
    // A second check for race conditions. If the user clicks two buttons
    // very fast, this prevents duplicate entries before the first one is written.
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    if (existingVote.length > 0) {
      await ctx.answerCallbackQuery({ text: "You have already voted." });
      return;
    }

    // Insert the new vote into the database.
    // Drizzle will throw an error if the 'telegram_user_id' is not unique,
    // which our catch block will handle.
    await db.insert(speakerVoteTGTable).values({
      id: nanoid(), // Generate a unique ID for the primary key
      telegram_user_id: telegramUserId,
      voted_for_id: votedForId,
    });

    // Confirm to the user that their vote was successful.
    await ctx.answerCallbackQuery({ text: "Thank you! Your vote is saved." });
    await ctx.editMessageText(
      `✅ Voted! You chose ${votedForId.replace("_", " ")}.`
    );
  } catch (error) {
    // This block will catch any database errors, including the unique constraint violation.
    console.error("Error processing vote:", error);
    await ctx.answerCallbackQuery({
      text: "An error occurred, or you have already voted.",
      show_alert: true, // Use an alert for errors.
    });
  }
});

/**
 * A fallback for any text message that isn't a command we handle.
 */
bot.on("message:text", async (ctx) => {
  await ctx.reply("Please use the /start command to begin voting.");
});

// This line connects your bot to the Next.js serverless function.
export const POST = webhookCallback(bot, "std/http");
