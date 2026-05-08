import { createHmac } from "crypto";
import { describe, expect, test } from "vitest";

import { validateTelegramMiniAppInitData } from "./mini-app-init-data";

const botToken = "123456:bot-token";
const now = new Date("2026-05-08T12:00:00.000Z");
const authDate = Math.floor(now.getTime() / 1000);

function buildSignedInitData(fields: Record<string, string>): string {
  const dataCheckString = Object.entries(fields)
    .sort(([firstKey], [secondKey]) =>
      firstKey < secondKey ? -1 : firstKey > secondKey ? 1 : 0
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return new URLSearchParams({ ...fields, hash }).toString();
}

describe("Telegram Mini App initData validation", () => {
  test("validates signed initData and extracts the Telegram voter identity", () => {
    const initData = buildSignedInitData({
      auth_date: String(authDate),
      query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
      user: JSON.stringify({
        first_name: "Олена",
        id: 123456789,
        username: "olena_vote",
      }),
    });

    const result = validateTelegramMiniAppInitData(initData, botToken, {
      now,
    });

    expect(result).toEqual({
      authDate: now,
      ok: true,
      user: {
        firstName: "Олена",
        id: 123456789,
        username: "olena_vote",
      },
    });
  });

  test("rejects tampered initData", () => {
    const initData = buildSignedInitData({
      auth_date: String(authDate),
      user: JSON.stringify({
        first_name: "Олена",
        id: 123456789,
      }),
    }).replace("123456789", "987654321");

    expect(
      validateTelegramMiniAppInitData(initData, botToken, { now })
    ).toMatchObject({
      ok: false,
    });
  });

  test("rejects expired initData", () => {
    const initData = buildSignedInitData({
      auth_date: String(authDate - 90_000),
      user: JSON.stringify({
        first_name: "Олена",
        id: 123456789,
      }),
    });

    expect(
      validateTelegramMiniAppInitData(initData, botToken, { now })
    ).toEqual({
      message: "Telegram initData is expired.",
      ok: false,
    });
  });
});
