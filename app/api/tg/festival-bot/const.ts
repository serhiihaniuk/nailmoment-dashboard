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
  {
    id: "contestant_nastassia_1",
    name: "Учасник 1",
    media: [
      {
        type: "video",
        file_id:
          "BAACAgIAAxkBAANdaIYBDpO0kzz1nK6TmrUift9qHKoAAh15AAJg5TFIQ7rJ4hjP5y02BA",
      },
      {
        type: "photo",
        file_id:
          "AgACAgIAAxkBAANfaIYBIa3zts4JkOHEVWyr4Z2wAAGQAAJ59jEbYOUxSOPJ2kk2zohqAQADAgADeQADNgQ",
      },
      {
        type: "photo",
        file_id:
          "AgACAgIAAxkBAANaaIYAAdR_fqDAfvJcak8Erl_8PH2AAAJ09jEbYOUxSBwj00ZlfcpKAQADAgADeQADNgQ",
      },
      {
        type: "photo",
        file_id:
          "AgACAgIAAxkBAANkaIYBTwpKlAROGxErWLn1jAp_bLcAApj1MRsyMzBIoVhn_F_mTw0BAAMCAAN5AAM2BA",
      },


    ],
  },
  {
    id: "contestant_nastia_2",
    name: "Учасник 2",
    media: [
      {
        type: "video",
        file_id:
          "BAACAgIAAxkBAANnaIYBn61_2O1abe0WCCYlSFRml-EAAiZ5AAJg5TFIYaw_0-_8FF82BA",
      },
      {
        type: "photo",
        file_id: "AgACAgIAAxkBAANpaIYBqV3k_Xlsc1yPkK1r5V9_u5cAAnz2MRtg5TFICM4GL2xA8Y4BAAMCAAN5AAM2BA"
      },
      {
        type: "photo",
        file_id: "AgACAgIAAxkBAANsaIYB2pPW3cKR4ZeV_gJdAAFf9ZfXAAJ99jEbYOUxSDpkqQjerDTnAQADAgADeQADNgQ"
      },
      {
        type: "photo",
        file_id: "AgACAgIAAxkBAANuaIYB8DTOHz2VKM42o5FnrR7rUuEAAn72MRtg5TFIL1kXX4SOB18BAAMCAAN5AAM2BA"
      }
    ],
  },
  {
    id: "contestant_daria_3",
    name: "Учасник 3",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAANwaIYCLPagoh4yM3SMRfDsyiP9Mz4AAi55AAJg5TFIs8wNknGHOMs2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAANyaIYCYhKctxZ9WpFS_sJAtfWxjmkAAoP2MRtg5TFISu7CpeDwB2QBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAN0aIYCaUjBG5n2VwABE8V1lh0iS6geAAKE9jEbYOUxSCmkH9KvPoMdAQADAgADeQADNgQ" },
      { type: "photo", file_id: "AgACAgIAAxkBAAN2aIYCcZ637d98c87ZzwWWUO7SvjkAAob2MRtg5TFIsuFd_YXI5eQBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_yulia_4",
    name: "Учасник 4",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAN4aIYCxB6IIP51HN0owvYGliOk9YsAAjl5AAJg5TFI-RiTOLvn1C02BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAN-aIYDHcXjBSt95fNBFzqVFNQ7WL4AAlT_MRuB8jBIGPXInDNpq5UBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAN6aIYDEC3hIb2IvSV_jR8AAS17WCVUAAKO9jEbYOUxSJ81MWqwSudIAQADAgADeQADNgQ" },
      { type: "photo", file_id: "AgACAgIAAxkBAAN8aIYDFg7L3p7urFUj6MJup9D5LC8AAo_2MRtg5TFIe4jy-DS8xqIBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_natali_5",
    name: "Учасник 5",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAOAaIYDh43BJlupZ0Duzbkogjk5V4oAAkJ5AAJg5TFI_dhyKgHRTyA2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAOGaIYDpnltUgxdrRuCIUPyZWdnZ_0AAqL2MRtg5TFIPAgr1gQu8PkBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOCaIYDmeEpGVGJOZRZu3eqtxkZ0QcAAqD2MRtg5TFIN2EVIfsNmxUBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOEaIYDoG1vNx3iJ6qBA62qek-2_sYAAqH2MRtg5TFIpDTuaiA8kF8BAAMCAAN5AAM2BA" },

    ]
  },
  {
    id: "contestant_daria_6",
    name: "Учасник 6",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAOIaIYD_FI0nEgaeGuaylse6bnEYb0AAkV5AAJg5TFIoY0V7z8dX9w2BA",
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAOMaIYEGb_EQSBFOTnamfGuTaADiWEAAq32MRtg5TFI31uW7GbK36UBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOKaIYEC4e7s6fYauBIti3u3lgldhoAAqz2MRtg5TFIjBFyWfP81P8BAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOOaIYEIU-h1uSkWfWdi-I75hFVCyYAAq72MRtg5TFIgdiAQ_zIxeYBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_sofiko_7",
    name: "Учасник 7",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAOQaIYEnx0XVF_z2WXQ9k7QjI-0NRoAAlB5AAJg5TFIQHHW2H62MYk2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAOSaIYEp6MlxvJBZ8Ba9Rw4OI2I1RwAArT2MRtg5TFIWlNburh6ibsBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOUaIYErsfDY_EfNSn2W2IYQr3AYeUAArb2MRtg5TFIXLL74rxC2PUBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOWaIYEtd-ku5spkFxnK27sz8jdAVsAArf2MRtg5TFIwKUD9RS17ewBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_marina_8",
    name: "Учасник 8",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAOYaIYFDhf3NyUmj39kquAlkpJm3WgAAlV5AAJg5TFIZg-gu-Y87gM2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAOcaIYFH7frSEYjkL3durL3GGB_S9MAArz2MRtg5TFIid2VkDNd8rIBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOeaIYFJllZyOxQhfUEC9sYLHpB_wcAAr72MRtg5TFI61UCWiV4WiABAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOaaIYFGRdB3EDEZn8B6bA_5icZkXsAArr2MRtg5TFI2TR4zmcT9w0BAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_roksana_9",
    name: "Учасник 9",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAOgaIYFateu4g3UkFO0HH9981eV1lwAAlt5AAJg5TFIA9Ls0GR_gmA2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAOiaIYFcAABi5ZcCIRCYapWlK4FEDh0AALD9jEbYOUxSCi-5uPxn47mAQADAgADeQADNgQ" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOmaIYFfPPBjsE2cKV_wAyk0nO0AusAAsX2MRtg5TFIH9Nx4lcRo8IBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOkaIYFd99BzvdtCXTuuTcxDMS6T9sAAsT2MRtg5TFIFGFSpGPof6oBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_daria_10",
    name: "Учасник 10",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAOoaIYFvUjbVeB1Xqq4edneinJO_coAAmB5AAJg5TFIS7y2Iy1bVhE2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAOqaIYFzIQa7Shm7WITBhupCHP7IeEAAsj2MRtg5TFIKpt3Q_RKunEBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOsaIYF1VBKvQl2n_cY66dBSuxDUjgAAmb_MRuB8jBI0Z1QYQMjRWUBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAOuaIYF33RcTMuXbAuLrIYtMRmvIWMAAsn2MRtg5TFI8_-PuBm815cBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_mila_11",
    name: "Учасник 11",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAOwaIYGRs_8CqwM1s7LMkKFI7DIZdsAAmR5AAJg5TFIJ7J9s4J_GYk2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAOyaIYGh8WbJjTK3CgYUq5ba5gcsGwAAt72MRtg5TFIAAG9JqF5BsFVAQADAgADeQADNgQ" },
      { type: "photo", file_id: "AgACAgIAAxkBAAO2aIYGlYWYPy4H5yV3LSa9fatZeNcAAuD2MRtg5TFIl94Nl6g-q34BAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAO0aIYGkJNJaOeytbQ7DrCE_hoXkeIAAt_2MRtg5TFIhDlSoT3GdJgBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_anna_12",
    name: "Учасник 12",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAO8aIYHGaaSFgf4OUnk_MHi4imMbeUAAnZ5AAJg5TFIET5cgyMaSdo2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAPCaIYHNU5rlEHl2951Ezu1iB3mhDYAAr_1MRsyMzBI9sSHZZTMdowBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPAaIYHMMoUEvO9zYh3bFFx-w9Fz6cAAuP2MRtg5TFIweP9ZiGlvHwBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAO-aIYHIrS5bMBO8BJUD9Wmo-aytw0AAuL2MRtg5TFIXEhrQiFWYZ8BAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_sofia_13",
    name: "Учасник 13",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAPEaIYIROhAG5P8OWwd_aleYz-3UpMAAoh5AAJg5TFIPlHkisTlCJU2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAPKaIYIV0jMrEhYUpV7U2w7zfUmI5gAAvD2MRtg5TFIkA6eTyWsqp0BAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPIaIYIUuYOYN8-QgMabjHNav7achgAAu_2MRtg5TFI6xX7GCWMp84BAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPGaIYITPIoN_T_vNYqW_723XBiQTQAAu72MRtg5TFIOMcFpl6HcTMBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_walentyna_14",
    name: "Учасник 14",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAPMaIYIpg2fKGCcF5I-yu1U77Y_hcMAAo95AAJg5TFIJiVYgTYsk7M2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAPSaIYIu8_mXEQaBDYL802_pMT8tnoAAvr2MRtg5TFIomajc6AnTHIBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPQaIYIswLXSnoU1T4XIjno1MNFxh0AAvj2MRtg5TFIdeLqGnvPGmoBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPOaIYIrkgesw0mY3_ICZloRuE-YIQAAvb2MRtg5TFIHuoQxAuqNOoBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_elizaveta_15",
    name: "Учасник 15",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAPUaIYI36v8qvriq-h6_oM17rlKOR4AApN5AAJg5TFIzhKgy2p_l_82BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAPYaIYI7fz6VeAMQrC6eyMQJoisI2AAAv32MRtg5TFIlHbln144qaYBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPWaIYI5kGwD4Br5m34aQP-vDJmRkYAAvv2MRtg5TFIc-3Z36_sf_MBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPaaIYI85S5Lg3VYC5N9G4xQLLJFVYAAv72MRtg5TFII08VkSlQFMABAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_wiktoria_16",
    name: "Учасник 16",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAPcaIYJEskCxiK36Jx8kofStDPhyysAApd5AAJg5TFIsWOHlCrYP-42BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAPgaIYJOuObFna4DHD8dLbXztj5o4gAAgv3MRtg5TFIJxAzsj3ixkkBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPiaIYJQGHQGaJBtv5U5_BPHO4ZugsAAs71MRsyMzBI8xovpvFcblwBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPeaIYJGG9fT2w75PjGSCqu1u7ww1EAAgL3MRtg5TFI5kQAAfo1a6XLAQADAgADeQADNgQ" },
    ]
  },
  {
    id: "contestant_oksana_17",
    name: "Учасник 17",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAPkaIYJxAqskv5IW58b1Q_GLL59w4AAAqJ5AAJg5TFIT9y35TzS5N42BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAPmaIYJzO3KZrNDDJ8BA3ibiqi4VcEAAg73MRtg5TFI9SMwMFyfh6cBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPqaIYJ27gdM_9kmsgUOCRrbrPDNlMAAhD3MRtg5TFIKJOzR1ylUQQBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPoaIYJ0iBoegGA58PsXyfKSll_msgAAg_3MRtg5TFIw9K-Hu5S6yoBAAMCAAN5AAM2BA" },
    ]
  },
  {
    id: "contestant_nadia_18",
    name: "Учасник 18",
    media: [
      {
        type: "video",
        file_id: "BAACAgIAAxkBAAPsaIYLhwtvayMDeccpFBeEoiaFzs4AArJ5AAJg5TFIDGsNfm64GGc2BA"
      },
      { type: "photo", file_id: "AgACAgIAAxkBAAPyaIYLm9Jk44q8BJXlvZjhNLgJ20EAAiL3MRtg5TFIq4X4xHcUwHsBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPwaIYLlZbALxZjk3UkZHqeA3Ta_XoAAiH3MRtg5TFISKn3EcqHUdUBAAMCAAN5AAM2BA" },
      { type: "photo", file_id: "AgACAgIAAxkBAAPuaIYLj2bBKnpzu27Fger-L27sJawAAiD3MRtg5TFINllisp6_TR8BAAMCAAN5AAM2BA" },
    ]
  },

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
      url: "https://docs.google.com/forms/d/e/1FAIpQLSdV3aFqsbrwtMhrTnCtbwlAVX7DYJpbRpzvHoVyZ-O5DMY9tQ/viewform?fbzx=-1323743507720173128"
    }
  }
]; 