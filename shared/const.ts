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
    isActive: false,
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
      {
        // nastasiia
        id: "french_contestant_nastasiia",
        name: "Учасник 9",
        photo_file_ids: [
          "AgACAgIAAxkBAAIf82hjlMvPxcV_10A9nQpP3p_dyRCCAAK46jEbcY8gSxiF2iYSczmxAQADAgADeQADNgQ",
        ],
      },
    ],
  },
  {
    id: "3d_design_korean_style",
    name: "3D дизайн / корейський стиль",
    isActive: true,
    contestants: [
      {
        id: "3d_design_korean_style_elizaveta_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIY8mhisRQpjLPY06qrl0VH-14jhJAoAALm9zEbw18ZSwpQP9xHtfsdAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIY9GhisRQG37cJJx1BE630teafN9m4AALn9zEbw18ZS45nE1YpwHlKAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIY9mhisRVUgLfKKix-oD-PFg7fcvL-AALo9zEbw18ZSy2Iz2kioyudAQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_roksana_2",
        name: "Учасник 2",
        photo_file_ids: [
          "AgACAgIAAxkBAAIY-GhisXp5mqtL37rDPqlV4gJq_Qy1AALu9zEbw18ZS7rm1-12oCucAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIY-mhisX0gx061mgyfIxoXslhIY-kvAAIW-TEbDB8YS3TAjht3_q3qAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIY_GhisYA1N6cw3aYKh1E51zRiW0-MAALv9zEbw18ZS0wWsfzbdm39AQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_marina_3",
        name: "Учасник 3",
        photo_file_ids: [
          "AgACAgIAAxkBAAIY_2hisdkEZTe36B50GO4LMLDaOlV5AAL29zEbw18ZS7ZJGF137T-4AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZAWhisdyrWdLOZdElmqfIJR9dD0qTAAL39zEbw18ZS56_Dy-tzz9qAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZA2hisd_T91bkeUbzbiVO73bOedbuAAIi9TEbDRsZS6thIDyexBbqAQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_nastia_4",
        name: "Учасник 4",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZB2hisjGAy9H5sNo2Td9WSh6qizSGAAL49zEbw18ZSzKuNHsajRRIAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZCWhisjSmd-SvBds14mCBbzlatadxAAIc-TEbDB8YS-kqAqDfSZxUAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZC2hisjbXC3Pf4H7ne_7WR6tVYEjVAAL59zEbw18ZSzjlyuXAK-rQAQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_sofia_5",
        name: "Учасник 5",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZD2hisp8CFyOdbq9vuLHfvY0ZfIVOAAP4MRvDXxlLf5l03w231jcBAAMCAAN5AAM2BA",
          "AgACAgIAAxkBAAIZEWhisqIBaCORU-3bGXtnBDjUI949AAIB-DEbw18ZSzHl0KVuAmRSAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZE2hisqUiH8q3mv4mivevwcB3-72BAAIp9TEbDRsZS0Zu3gus9jwoAQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_yuliia_6",
        name: "Учасник 6",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZFmhist-cyUqbLxPhrfmow6rSHYT7AAID-DEbw18ZSxtgYuNgc2UOAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZGGhisuII6dSMT1MQk9HHwwQoSXLwAAIE-DEbw18ZS2h_88BGrzllAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZGmhisuUlFX3q5drNw-dglhLzW0UKAAIF-DEbw18ZS4azKxI1mVbPAQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_anna_soloviova_7",
        name: "Учасник 7",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZHmhiszHUH7dhRiqvA3J_459_bYZCAAIp-TEbDB8YS25KBfLhrzKjAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZIGhiszQrXoNk87aFChdky_kmHLuZAAIH-DEbw18ZS5RWVYjGeseFAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZImhiszbN-o3IJpMHKHpgdb156Cc3AAII-DEbw18ZS3RKYZQvGcm5AQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_oksana_8",
        name: "Учасник 8",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZJmhis6xiZAZ_drUM3PD1g1X-OUH6AAIN-DEbw18ZS6DbdUJ4m5FfAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZKGhis7CRHaQjz_IP-Ood0mLVu9coAAIs-TEbDB8YS1q_Y6ksG5o0AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZKmhis76O1KPmDsMDAvEewUv5NJu8AAIO-DEbw18ZSySfFVHA48tlAQADAgADeQADNgQ",
        ],
      },
      {
        id: "3d_design_korean_style_nadia_9",
        name: "Учасник 9",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZLmhitDWd3_LS8CVmty2NcIPf4cjiAAIP-DEbw18ZS8w748D4PmUMAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZMGhitDkDCzi4DE6o2jxs_bRvyrQCAAIQ-DEbw18ZS9rD-pInQB6_AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZMmhitDzG92JpxXnvEAnPRorfEZExAAIR-DEbw18ZS1dt5yspJqn3AQADAgADeQADNgQ",
        ],
      },
    ],
  },
  {
    id: "neon_manicure",
    name: "Неоновий манікюр",
    isActive: false,
    contestants: [
      {
        id: "neon_manicure_nadia_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZNWhitR3OoHqakWBjlve6hFK8Z8DEAAI--TEbDB8YSyjuBM8TLayvAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZN2hitR_ZowE6BOvZb-HzE4H_qFRTAAIW-DEbw18ZS-Dn7iUIClEYAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZOWhitSI6A-TgOP13Si3OmmXpRUh4AAIY-DEbw18ZSxraerN91eJUAQADAgADeQADNgQ",
        ],
      },
      {
        id: "neon_manicure_oksana_2",
        name: "Учасник 2",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZQWhitYTNGSt8agsglTs_BYjW61PGAAId-DEbw18ZS4t8qepjyimoAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZQ2hitYdW3e5szHARR262Lp8o9oXHAAIe-DEbw18ZS-I0G0VMte69AQADAgADeQADNgQ",
        ],
      },
      {
        id: "neon_manicure_anna_soloviova_3",
        name: "Учасник 3",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZR2hitdjvoIOfhcNSaGqfpnzNzu7ZAAIh-DEbw18ZSzdqG3PFJUO-AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZSWhitdra9p12uVZqPSW4SygXdsUvAAJA-TEbDB8YS59h34PDyGxhAQADAgADeQADNgQ",
        ],
      },
      {
        id: "neon_manicure_maria_lisunova_4",
        name: "Учасник 4",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZTWhitim401d6MXPjF4g_sU4XHCr4AAIj-DEbw18ZS4wJWhNz5EL9AQADAgADeQADNgQ",
        ],
      },
      {
        id: "neon_manicure_daria_rakhniu_5",
        name: "Учасник 5",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZUWhitlfk4fP46vnN1nk4eULryw88AAIk-DEbw18ZSyw8byjV4jZbAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZU2hitnd_AgqMt_ZyN7QZ0mz9v6EkAAIl-DEbw18ZS96K6BhM6pxJAQADAgADeQADNgQ",
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
        id: "gradient_nadia_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZVmhit0OMccxY1rK11XNs0R9LlC1PAAIp-DEbw18ZS3l4ZvKQwM64AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZWGhit0VM3fsiKfV6fDuvkxUgWVTAAAJQ-TEbDB8YS7u1D4AeYvdaAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZWmhit0nvs94LBbzLA33WI2Fgj9VFAAIq-DEbw18ZS5dstRt3K-p3AQADAgADeQADNgQ",
        ],
      },
      {
        id: "gradient_daria_pos_2",
        name: "Учасник 2",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZX2hit788nivUxxqSdZvppOo0QZFJAAJK9TEbDRsZSym8E4gB7YrfAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZYWhit8ICOVuOK9I4S4QCsVJVZAkSAAIs-DEbw18ZS5TlVEEKTJJ_AQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZY2hit8XlTpoS3TyuQzRNuuuuJkZPAAIt-DEbw18ZS2e_qKXpNPoRAQADAgADeQADNgQ",
        ],
      },
    ],
  },
  {
    id: "monotone",
    name: "Однотонний манікюр",
    isActive: false,
    contestants: [
      {
        id: "monotone_oksana_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZZ2hiuKmdqJI4QKEfwjHTk1JHTGhtAAI1-DEbw18ZS2oCKBdRIJhJAQADAgADeQADNgQ",
        ],
      },
      {
        id: "monotone_nadia_2",
        name: "Учасник 2",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZamhiuNsAAezRo5Z-OE7KOYLBLMLBKgACN_gxG8NfGUtYeTN_RMbvXgEAAwIAA3kAAzYE",
          "AgACAgIAAxkBAAIZbGhiuN-9486uCNm_ot0OWsqa1hxiAAI4-DEbw18ZS7YVFHOUj5ZJAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZbmhiuOL9tBh36VTpdEzuuldwRzxBAAI5-DEbw18ZS4cfOPnRSBWAAQADAgADeQADNgQ",
        ],
      },
      {
        id: "monotone_natali_3",
        name: "Учасник 3",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZcWhiuSSj4L7wS8vW3MliF2tgHcGnAAI7-DEbw18ZSyHGbxfOHiLkAQADAgADeQADNgQ",
        ],
      },
      {
        id: "monotone_nastasiia_4",
        name: "Учасник 4",
        photo_file_ids: [
          "AgACAgIAAxkBAAIf9WhjlQP-q7WaaVES9bFUZC7VKUGpAAK56jEbcY8gS6POj4Z4lX2pAQADAgADeQADNgQ",
        ],
      },
    ],
  },
  {
    id: "extreme_length",
    name: "Екстримальна довжина",
    isActive: false,
    contestants: [
      {
        id: "extreme_length_nadia_1",
        name: "Учасник 1",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZdWhiufvz8O5ndNDjOhQjxFYB1WYPAAI_-DEbw18ZS5ZYb-4PBigCAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZd2hiuf0AAU0SuVhMc1XJzkP6w-bzrAACQPgxG8NfGUspevfeqiUOLgEAAwIAA3kAAzYE",
          "AgACAgIAAxkBAAIZeWhiugGhpb0PZG8ms80flLCP7cDCAAJB-DEbw18ZS5hyeEWDFsLCAQADAgADeQADNgQ",
        ],
      },
      {
        id: "extreme_length_oksana_2",
        name: "Учасник 2",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZfWhiukNLhDTeGw6WpLDutKituoAuAAJC-DEbw18ZS2R2UUsuueYPAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZf2hiukeu6oRjgGneHacbW8X_AbUxAAJD-DEbw18ZS7LZTASxkrYmAQADAgADeQADNgQ",
        ],
      },
      {
        id: "extreme_length_viktoriya_3",
        name: "Учасник 3",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZg2hiuoOy4XmwJmmvDFJsVgbxZZUgAAJE-DEbw18ZS76qhdUG0LOPAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZhWhiuodinwIGw9oiAe65pIHTVJ0rAAJF-DEbw18ZS41AoYRRD3VcAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZh2hiuoqj7NHSLopIAlXS--tjlE4GAAJS9TEbDRsZS6BJM4ghGwABCgEAAwIAA3kAAzYE",
        ],
      },
      {
        id: "extreme_length_daria_pos_4",
        name: "Учасник 4",
        photo_file_ids: [
          "AgACAgIAAxkBAAIZi2hiurknQ5aPLGh_8IENwv_9k_ciAAJG-DEbw18ZS6Si7vqyKKKmAQADAgADeQADNgQ",
          "AgACAgIAAxkBAAIZjWhiurwzAstFLTNVj-MCYkFCm1nyAAJH-DEbw18ZS5MuqWh5z_YEAQADAgADeQADNgQ",
        ],
      },
    ],
  },
];

export type BattleCategory = (typeof BATTLE_CATEGORIES)[number];

export const BROADCAST_MESSAGES = [
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
