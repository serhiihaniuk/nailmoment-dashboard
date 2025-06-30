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
