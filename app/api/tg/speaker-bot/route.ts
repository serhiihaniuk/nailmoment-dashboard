import { Bot, webhookCallback } from "grammy";

// You might want to use a more robust way to get this token,
// like using a secret manager. But for this guide, we'll use an environment variable.
const token = process.env.TG_BOT;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

// This is the entryway for your bot.
// It's like the main function of your bot.
bot.command("start", async (ctx) => {
  await ctx.reply("Hello, world! I am a bot running on Next.js.");
});

bot.on("message:text", async (ctx) => {
  const messageText = ctx.message.text;
  await ctx.reply(`You said: "${messageText}"`);
});

/**
 * We are exporting a single function that will handle all incoming requests.
 *
 * We can use the `webhookCallback` function from `grammy` to handle the request
 * and convert it into an update for the bot.
 */
export const POST = webhookCallback(bot, "next-js");
