export const TICKET_TYPE = {
  VIP: "vip",
  STANDARD: "standard",
  MAXI: "maxi",
  GUEST: "guest",
} as const;
export type TicketGrade = (typeof TICKET_TYPE)[keyof typeof TICKET_TYPE];

export const TICKET_TYPE_LIST: TicketGrade[] = Object.values(TICKET_TYPE);

export const SPEAKERS = [
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
  {
    id: "video_11",
    name: "Полина Юсупова",
    file_id:
      "BAACAgIAAxkBAAICGWhWoHdkZ-yKGZixwyzDggmZW4V3AAK0cwACUgi4Ss5L18EE1XnzNgQ",
  },
];

export const BATTLE_CATEGORIES = [
  {
    id: "french",
    name: "Французький манікюр",
    isActive: true,
    contestants: [
      {
        id: "french_contestant_nadia",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYYGhiki0Wn8vuyqTMbJRhrjtZCTTgAAIC9zEbw18ZS0O__ohKii4jAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYYmhikjbf2w2M8plX5QJ2gffCaxQGAAID9zEbw18ZSy1rj-gaz97aAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYZGhikjvC-RNbj0Txk3gWFEAKgcD2AAIE9zEbw18ZS4E3Orsdch_qAQADAgADeQADNgQ",
        ],
      },
      {
        id: "french_contestant_daria",
        name: "Учасник 2",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYZmhikoNKWw_-LeWZupT2PW1HRyTSAAIG9zEbw18ZS4ebpNJVAbEWAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYaGhikofDR671IAFEDIxjSbNLRYakAAIH9zEbw18ZS4PeyQj2bzqCAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYamhikorIp5KGqWrk33p0HOu0SgN2AAII9zEbw18ZS30SP_SgGDfpAQADAgADeQADNgQ",
        ],
      },
      {
        id: "french_contestant_walentyna_kro",
        name: "Учасник 3",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYbmhikyJCL2QLkMmixX0PM2GIvf39AAIN9zEbw18ZS3jo9XuvHedrAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYcGhikyaPT1RohVkQkXxX293u78VgAAIO9zEbw18ZS1Ya_oV5oFFtAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYcmhikykjgvCAnxNNJQpV8oiWWx6ZAAIP9zEbw18ZS2TuXpON0lfmAQADAgADeQADNgQ",
        ],
      },
      {
        id: "french_contestant_oksana",
        name: "Учасник 4",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYdWhik7HvbrT5e2RDaeAi3BKGJQvGAAIU9zEbw18ZS4sJFt3835D3AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYd2hik7R7cCoWuGOvoiNO6jhbOdhPAAIV9zEbw18ZSwfWZ7DPQkAnAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYeWhik89zqLQ-GOi48vnbTfSEuMbfAAIW9zEbw18ZS-dXodcS44_ZAQADAgADeQADNgQ",
        ],
      },
      {
        id: "french_contestant_natali",
        name: "Учасник 5",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYe2hilB2fbokO2OaQZDLu5fnGZI70AAIY9zEbw18ZSx8OKeCn_0FdAQADAgADeQADNgQ",
        ],
      },
      {
        id: "french_contestant_sofiko",
        name: "Учасник 6",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYfWhilGCHRHOfdqpPkal1pFR2wvbdAAIZ9zEbw18ZSyh0zC_8GM6mAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYf2hilGd_zwnp9WB5gynQwpga8QqfAAIa9zEbw18ZS1BA6IfqRhtZAQADAgADeQADNgQ",
        ],
      },
      {
        id: "french_contestant_yulia_tsiupak",
        name: "Учасник 7",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYgmhilMqJQpRg6azdA-DbHhtQpeZ6AAId9zEbw18ZS6Q3umAsFL31AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYhGhilM2f5u3_DtrJx6pOCtyHUMxpAAIe9zEbw18ZS79EEfLFBfwLAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIYhmhilM9y-6YjUjPdYcoB3e_A_xOoAAP4MRsMHxhLoFdoMqzmEQYBAAMCAAN5AAM2BA",
        ],
      },
      {
        id: "french_contestant_mila",
        name: "Учасник 8",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYiWhilRV3ildTHiKYyxleFS7X3h4CAAIl9zEbw18ZS7t6wArdmflzAQADAgADeQADNgQ",
        ],
      },
    ],
  },

  {
    id: "gradient",
    name: "Градієнт",
    isActive: false,
    contestants: [
      {
        id: "gradient_contestant_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
        ],
      },
    ],
  },

  {
    id: "3d_korean",
    name: "3D / корейський дизайн",
    isActive: false,
    contestants: [
      {
        id: "3d_korean_contestant_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
        ],
      },
    ],
  },

  {
    id: "neon",
    name: "Неоновий манікюр",
    isActive: false,
    contestants: [],
  },

  {
    id: "monotone",
    name: "Однотонний манікюр",
    isActive: false,
    contestants: [
      {
        id: "monotone_contestant_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
        ],
      },
    ],
  },

  {
    id: "extra_length",
    name: "Екстра довжина",
    isActive: false,
    contestants: [
      {
        id: "extra_length_contestant_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
          "AgACAgIAAxkBAAIYK2hifLevJvScat0woW0wwe_708i8AAJv9jEbw18ZS-HooCZW20Y2AQADAgADeAADNgQ",
        ],
      },
    ],
  },
];

export type BattleCategory = (typeof BATTLE_CATEGORIES)[number];

export const BROADCAST_MESSAGES = [
  // --- Message 1: Last Call for Entries ---
  {
    id: "last_call_for_entries",
    text: `Привіт, друзі! Ми відкриваємо останню можливість, щоб подати заявку на участь у конкурсі «Битва майстрів» ✨

Якщо ви ще не встигли надіслати свою роботу — зробити це можна тільки сьогодні до 23:59!

💅 Усі деталі та умови участі — за посиланням
📩 Надіслати роботу можна прямо зараз!
Що потрібно: купити квиток битви майстрів (один чи декілька) та вислати нам у телеграм свою роботу. Все!

Не проґавте шанс стати фіналістом та поборотись за кубок, призи й визнання на сцені Nail Moment 💛`,
    button: {
      text: "Перейти на сайт",
      url: "https://www.nailmoment.pl",
    },
  },

  // --- Message 2: General Voting Start Announcement ---
  {
    id: "voting_start_general",
    text: `Сьогодні стартує голосування в одній з номінацій конкурсу «Битва майстрів»!
Обіцяємо, буде цікаво — талановиті учасники, круті ідеї та wow-дизайни 🔥

🕖 Голосування триває тільки до завтра, 12:00 (за Варшавою)

🚀 Переходь до голосування та підтримай своїх фаворитів!`,
    button: {
      text: "📌 Перейти до голосування",
      callback_data: "show_votes",
    },
  },

  // --- Message 3: Important Voting Rules ---
  {
    id: "voting_rules",
    text: `⚡️ ВАЖЛИВО! ⚡️

У кожній номінації ти можеш віддати лише 1 голос — за роботу, яка тебе вразила найбільше ✨

Рекомендуємо подивитися всі заявки перед тим, як зробити вибір.
Саме від тебе залежить, хто потрапить до фіналу конкурсу 💪

Щоб підтримати учасника — тисни кнопку «Це переможець» під його роботою.

🎯 Обери найкращих — нехай переможуть достойні!`,
    button: null, // No button for this message
  },

  // --- Message 4: Category-Specific Announcements ---
  // We can dynamically insert the category name later
  {
    id: "category_voting_start",
    // The placeholder {categoryName} will be replaced with the actual name
    text: `🎉 Привіт, друзі!
Сьогодні, {date}, стартувало голосування в номінації «{categoryName}».
Голосування триватиме до завтра, {endDate}, до 12:00 (за Варшавою).

💥 Підтримайте майстрів — голосуйте!`,
    button: {
      text: "ПЕРЕЙТИ ДО ГОЛОСУВАННЯ",
      callback_data: "show_votes",
    },
  },

  // --- Message 5: Final Tour Announcement ---
  {
    id: "final_tour_start",
    text: `🎉 Привіт, друзі!
Наш Відбірковий тур виходить на фінішну пряму.
Сьогодні, {date}, стартувало голосування в номінації «{categoryName}».
Голосування триватиме до завтра, {endDate}, до 12:00 (за Варшавою).

💥 Підтримайте майстрів — голосуйте!`,
    button: {
      text: "ПЕРЕЙТИ ДО ГОЛОСУВАННЯ",
      callback_data: "show_votes",
    },
  },

  // --- Message 6: Last Category Announcement ---
  {
    id: "last_category_start",
    text: `🎉 Привіт, друзі!
Наш Відбірковий тур добігає кінця.
Сьогодні, {date}, стартувало голосування в останній номінації — «{categoryName}».
Голосування триватиме до завтра, {endDate}, до 12:00 (за Варшавою).

💥 Підтримайте майстрів — голосуйте!`,
    button: {
      text: "ПЕРЕЙТИ ДО ГОЛОСУВАННЯ",
      callback_data: "show_votes",
    },
  },

  // --- Message 7: End of Voting Announcement ---
  {
    id: "voting_ended",
    text: `✨ Відбірковий тур завершено! ✨

Друзі, ми з радістю оголошуємо: відбірковий етап конкурсу «Битва майстрів» офіційно завершено!
6 номінацій, десятки неймовірних робіт, сотні голосів — і ми маємо імена фіналістів, які вже зовсім скоро зійдуться у фіналі за головний приз!

👏 Вітаємо кожного з 18 фіналістів — ви по-справжньому заслужили своє місце у фіналі!

🙏 Дякуємо всім учасникам за ваш талант, натхнення і пристрасть до своєї справи!
❤️ Дякуємо кожному, хто голосував і підтримував майстрів — ваш голос мав значення!

🗓️ Фінал конкурсу відбудеться 27 липня у місті Вроцлав, у рамках фестивалю Nail Moment.
🏆 Головний приз — 2000 злотих та подарунки від партнерів фестивалю.
🎁 Кожен фіналіст також отримає подарунки від партнерів фестивалю.

До зустрічі на фестивалі!
Буде яскраво, гучно й по-справжньому nail-круто 💥`,
    button: {
      text: "КУПИТИ КВИТОК НА ФЕСТИВАЛЬ",
      url: "https://www.nailmoment.pl/",
    },
  },
];
