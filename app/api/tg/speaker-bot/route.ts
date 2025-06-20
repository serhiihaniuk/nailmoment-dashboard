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

const WELCOME_MESSAGE_PART_1 = `Привіт! Я — бот Nail Moment, і я допоможу визначити переможця конкурсу «Народний спікер», який проходить у рамках підготовки до нашого фестивалю у Вроцлаві 💛💅

🎤 Переможець конкурсу виступить на головній сцені Nail Moment 27 липня 2025 року з авторською темою, яка переможе у голосуванні.`;

const WELCOME_MESSAGE_PART_2 = `📹 Відеопрезентації учасників уже доступні! Перед тим, як голосувати, обов’язково переглянь усі заявки!

Голосування проходитиме в цьому чат-боті 💬
Хто стане наступною зіркою нашої сцени? Обираєш саме ти!`;

const SPEAKERS = [
  {
    id: "video_1",
    name: "Anna Soloviova",
    file_id:
      "BAACAgIAAxkBAAIBG2hVT71yjORJP9C_6G179cyIh5VuAAIBeQACuEmpSgFPJSaD8w2JNgQ",
  },
  {
    id: "video_2",
    name: "Таті",
    file_id:
      "BAACAgIAAxkBAAIBHWhVUIa-YTVvO3fu8NeqCeve30rPAAJqbwACUgioSqdJcE2mrBceNgQ",
  },
  {
    id: "video_3",
    name: "Ася",
    file_id:
      "BAACAgIAAxkBAAIBH2hVUIpvPhjvKYDeGCk8xRnx1JMcAAJrbwACUgioSrgQm0GifuhgNgQ",
  },
  {
    id: "video_4",
    name: "Ирина Бондарчук",
    file_id:
      "BAACAgIAAxkBAAIBIWhVUI4p3ww4znpnAeW1H-mkLut9AAJtbwACUgioSrYaQI-MuyrANgQ",
  },
  {
    id: "video_5",
    name: "Настенька Вахулка",
    file_id:
      "BAACAgIAAxkBAAIBI2hVUJLpxgWykIYmLg81yHpQbsBmAAJubwACUgioSoNWibi6PI14NgQ",
  },
  {
    id: "video_6",
    name: "Sofiko",
    file_id:
      "BAACAgIAAxkBAAIBJWhVUJbeTFeqIqVrv2iou5-xd6SXAAJwbwACUgioSog4y_8mDOWjNgQ",
  },
  {
    id: "video_7",
    name: "Nataliia Roshchuk",
    file_id:
      "BAACAgIAAxkBAAIBJ2hVUJvoqCdxxGn6D3NP8N0IfscZAAJxbwACUgioSoHJsbCWYHhjNgQ",
  },
  {
    id: "video_8",
    name: "Katerina",
    file_id:
      "BAACAgIAAxkBAAIBLWhVUKlsaztpb6g2VLCVeu3G3WW1AAJ1bwACUgioSrx1CweRBSrPNgQ",
  },
  {
    id: "video_9",
    name: "Walentyna",
    file_id:
      "BAACAgIAAxkBAAIBKWhVUJz0L_eLF2m5L8al7u81BPU2AAJybwACUgioSl-oLls7kt0_NgQ",
  },
  {
    id: "video_10",
    name: "Viктория",
    file_id:
      "BAACAgIAAxkBAAIBK2hVUKKGSc3bouhp9K0qqK7V-HObAAJzbwACUgioSmyeUIFsDly6NgQ",
  },
];

function escapeMarkdownV2(text: string): string {
  const charsToEscape = /[_\[\]()~`>#+\-=|{}.!]/g;
  return text.replace(charsToEscape, (char) => `\\${char}`);
}

async function initiateVotingFlow(ctx: Context) {
  const telegramUserId = ctx.from!.id;
  try {
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

    for (let i = 0; i < SPEAKERS.length; i++) {
      const videoNumber = i + 1;
      const speaker = SPEAKERS[i];
      let caption: string;
      let keyboard: InlineKeyboard;

      if (speaker.id === votedForId) {
        caption = escapeMarkdownV2(
          `✅ Ви вже проголосували за Відео #${videoNumber}`
        );
        keyboard = new InlineKeyboard().text(
          "Скинути мій голос 🔄",
          `reset_vote:${videoNumber}`
        );
      } else {
        caption = escapeMarkdownV2(
          `Це Відео #${videoNumber} — ${speaker.name}`
        );
        keyboard = new InlineKeyboard().text(
          `Проголосувати за ${speaker.name} 👍`,
          `vote:${videoNumber}`
        );
      }

      await ctx.replyWithVideo(speaker.file_id, {
        caption: caption,
        reply_markup: keyboard,
        parse_mode: "MarkdownV2",
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error("Error in initiateVotingFlow:", error);
    await ctx.reply("Вибачте, сталася помилка. Спробуйте пізніше.");
  }
}

bot.command("start", async (ctx) => {
  await ctx.reply(escapeMarkdownV2(WELCOME_MESSAGE_PART_1), {
    parse_mode: "MarkdownV2",
  });

  const showVideosKeyboard = new InlineKeyboard().text(
    "Показати відео для голосування",
    "show_videos"
  );
  await ctx.reply(escapeMarkdownV2(WELCOME_MESSAGE_PART_2), {
    reply_markup: showVideosKeyboard,
    parse_mode: "MarkdownV2",
  });
});

bot.command("vote", (ctx) => initiateVotingFlow(ctx));

// --- NEW COMMAND HANDLER ---
bot.command("reset", async (ctx) => {
  const telegramUserId = ctx.from!.id;
  try {
    const existingVote = await db
      .select()
      .from(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId))
      .limit(1);

    let replyMessage: string;

    if (existingVote.length > 0) {
      await db
        .delete(speakerVoteTGTable)
        .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId));
      replyMessage =
        "Ваш попередній голос видалено. Тепер ви можете голосувати знову.";
    } else {
      replyMessage = "У вас немає активного голосу, який можна було б скинути.";
    }

    const showVideosKeyboard = new InlineKeyboard().text(
      "Показати відео для голосування",
      "show_videos"
    );
    await ctx.reply(escapeMarkdownV2(replyMessage), {
      reply_markup: showVideosKeyboard,
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    console.error("Error in /reset command:", error);
    await ctx.reply("Вибачте, сталася помилка під час скидання вашого голосу.");
  }
});
// -------------------------

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
    const resetKeyboard = new InlineKeyboard().text(
      "Скинути мій голос 🔄",
      `reset_vote:${videoNumber}`
    );
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(
        `✅ Проголосовано! 🔥🔥🔥 

        Ви обрали Відео #${videoNumber}`
      ),
      reply_markup: resetKeyboard,
      parse_mode: "MarkdownV2",
    });
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
  const videoNumber = parseInt(ctx.match[1], 10);
  try {
    await db
      .delete(speakerVoteTGTable)
      .where(eq(speakerVoteTGTable.telegram_user_id, telegramUserId));
    await ctx.answerCallbackQuery({
      text: "Ваш голос скинуто! Тепер ви можете голосувати знову.",
    });
    const voteKeyboard = new InlineKeyboard().text(
      "Проголосувати за це 👍",
      `vote:${videoNumber}`
    );
    await ctx.editMessageCaption({
      caption: escapeMarkdownV2(`Це Відео #${videoNumber}`),
      reply_markup: voteKeyboard,
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

export const POST = webhookCallback(bot, "std/http");
