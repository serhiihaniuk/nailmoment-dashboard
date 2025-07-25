import type { ParseMode } from "@grammyjs/types";

export const PARSE_MODE: ParseMode = "MarkdownV2";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- WELCOME MESSAGES ---

export const BATTLE_WELCOME_1 = `👋 Привіт! Я — чат-бот, який допоможе визначити переможця конкурсу «Битва майстрів», що проходить у межах манікюрного фестивалю Nail Moment.

І зараз пару слів від організаторів:`;

export const BATTLE_WELCOME_2 = `Привіт, наші неіл-майстри! ☺️
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

export const BATTLE_WELCOME_3 = `Нагадуємо:
Ви можете віддати лише 1 голос — за того учасника, якого вважаєте гідним перемоги.

Голосування проводять тільки учасники фестивалю, тож саме ви вирішуєте, хто отримає кубок!

Обирайте серцем і голосуйте за роботу, яка справді вразила 💥`;


// --- CONTESTANTS DATA ---
type FestivalContestant = {
  id: string;
  name: string;
  media: {
    type: "photo" | "video";
    file_id: string;
  }[];
}
export const FESTIVAL_CONTESTANTS: FestivalContestant[] = [
  // {
  //   id: "mock-contestant-1",
  //   name: "Mock Speaker 1",
  //   media: [
  //     {
  //       type: "photo",
  //       file_id:
  //         "AgACAgIAAxkBAAMOaIJsaUnyOfl_ZWOkKEC1RpjFSv4AAnbxMRsK8hlIiETYpXwE0lsBAAMCAAN4AAM2BA",
  //     },
  //     {
  //       type: "video",
  //       file_id:
  //         "BAACAgIAAxkBAAMfaIJusQdWJ5CY2eLJo3r7mnb90IYAAuF6AAIK8hlIcn4MQ1WMtTI2BA",
  //     },
  //   ],
  // },
  // {
  //   id: "mock-contestant-2",
  //   name: "Mock Speaker 2",
  //   media: [
  //     {
  //       type: "photo",
  //       file_id:
  //         "AgACAgIAAxkBAAMOaIJsaUnyOfl_ZWOkKEC1RpjFSv4AAnbxMRsK8hlIiETYpXwE0lsBAAMCAAN4AAM2BA",
  //     },
  //   ],
  // },
  // {
  //   id: "mock-contestant-3",
  //   name: "Mock Speaker 3",
  //   media: [
  //     {
  //       type: "video",
  //       file_id:
  //         "BAACAgIAAxkBAAMfaIJusQdWJ5CY2eLJo3r7mnb90IYAAuF6AAIK8hlIcn4MQ1WMtTI2BA",
  //     },
  //   ],
  // },
];


// --- BROADCAST MESSAGES ---

export const FESTIVAL_BROADCAST_MESSAGES = [
    {
        id: "last_call_broadcast",
        text: `⏳ До 19:00 залишилось зовсім трішки!

А це означає, що до завершення голосування у «Битві майстрів» лишаються лічені хвилини 🔥

Якщо ви ще не встигли віддати свій голос за того, кого вважаєте гідним перемоги — зараз саме час це зробити!

💛 Ваш голос вирішальний!`,
        button: {
            text: "Віддати свій голос",
            callback_data: "show_votes"
        }
    },
    {
        id: "voting_finished_broadcast",
        text: `✅ Голосування завершено!

Ми вже підраховуємо голоси — зовсім скоро на головній сцені фестивалю ви дізнаєтесь, хто став переможцем конкурсу «Битва майстрів 2025»!

🏆 І забере сьогодні додому:
– Кубок переможця Битви Майстрів
– Грошовий приз у розмірі 2000 злотих
- Ціла валіза з матеріалами на сумму 2000 зл від партнера Битви Майстрів компанії Edlen 🩷
– Цінні подарунки від партнерів фестивалю

Хто стане першим чемпіоном «Битви майстрів» у рамках Nail Moment?
Дізнаємось вже дуже скоро 💥`
    },
    {
        id: "festival_finished_broadcast",
        text: `✨ Ну що ж, фестиваль Nail Moment 2025 — наш четвертий фестиваль — офіційно завершився!

Ми хочемо щиро подякувати кожному з вас, хто приїхав, хто знайшов час і сили вирватись із рутини, з роботи, щоб перезавантажитись, ожити, трохи видихнути й знову наповнитись натхненням 💛

Від імені Ангеліни, Міші та Юлі — дякуємо, що обрали саме наш фестиваль і провели цей день разом із нами.

📝 Нам буде дуже приємно, якщо ви поділитесь своїми враженнями. Як вам фестиваль?
Залиште, будь ласка, короткий відгук у формі нижче.

🎁 А після заповнення анкети — на вас чекає подарунок: безкоштовний відеоурок від нас — на знак подяки за ваш зворотний зв’язок.`,
        button: {
            text: "Залишити відгук та отримати подарунок",
            url: "https://forms.gle/your-feedback-form-url" // <-- IMPORTANT: Replace with your actual Google Form URL
        }
    }
]; 