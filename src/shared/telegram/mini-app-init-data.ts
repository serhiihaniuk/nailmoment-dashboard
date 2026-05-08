import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const TELEGRAM_WEB_APP_DATA_KEY = "WebAppData";
export const TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

const telegramWebAppUserSchema = z.object({
  first_name: z.string().trim().min(1),
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  username: z.string().trim().min(1).optional(),
});

const authDateSchema = z.coerce.number().int().positive();

export interface TelegramMiniAppUser {
  firstName: string;
  id: number;
  username?: string;
}

export type TelegramMiniAppInitDataValidationResult =
  | {
      authDate: Date;
      ok: true;
      user: TelegramMiniAppUser;
    }
  | {
      message: string;
      ok: false;
    };

export function validateTelegramMiniAppInitData(
  initData: string,
  botToken: string,
  options: {
    maxAgeSeconds?: number;
    now?: Date;
  } = {}
): TelegramMiniAppInitDataValidationResult {
  const fieldsResult = parseInitDataFields(initData);
  if (!fieldsResult.ok) {
    return fieldsResult;
  }

  const { fields, hash } = fieldsResult;
  const dataCheckString = buildDataCheckString(fields);
  const expectedHash = buildTelegramInitDataHash(dataCheckString, botToken);

  if (!safeEqualHex(hash, expectedHash)) {
    return { message: "Telegram initData hash is invalid.", ok: false };
  }

  const authDateResult = authDateSchema.safeParse(fields.get("auth_date"));
  if (!authDateResult.success) {
    return { message: "Telegram initData auth_date is invalid.", ok: false };
  }

  const now = options.now ?? new Date();
  const maxAgeSeconds =
    options.maxAgeSeconds ?? TELEGRAM_INIT_DATA_MAX_AGE_SECONDS;
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const authDateSeconds = authDateResult.data;

  if (authDateSeconds > nowSeconds + 60) {
    return { message: "Telegram initData auth_date is in the future.", ok: false };
  }

  if (nowSeconds - authDateSeconds > maxAgeSeconds) {
    return { message: "Telegram initData is expired.", ok: false };
  }

  const userResult = parseTelegramMiniAppUser(fields.get("user"));
  if (!userResult.ok) {
    return userResult;
  }

  return {
    authDate: new Date(authDateSeconds * 1000),
    ok: true,
    user: userResult.user,
  };
}

function parseInitDataFields(
  initData: string
):
  | {
      fields: Map<string, string>;
      hash: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    } {
  const trimmedInitData = initData.trim();

  if (trimmedInitData.length === 0) {
    return { message: "Telegram initData is required.", ok: false };
  }

  const params = new URLSearchParams(trimmedInitData);
  const hash = params.get("hash");

  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return { message: "Telegram initData hash is missing.", ok: false };
  }

  const fields = new Map<string, string>();

  for (const [key, value] of params.entries()) {
    if (key === "hash") {
      continue;
    }

    if (fields.has(key)) {
      return {
        message: `Telegram initData contains duplicate field: ${key}.`,
        ok: false,
      };
    }

    fields.set(key, value);
  }

  if (fields.size === 0) {
    return { message: "Telegram initData has no signed fields.", ok: false };
  }

  return { fields, hash, ok: true };
}

function buildDataCheckString(fields: ReadonlyMap<string, string>): string {
  return [...fields.entries()]
    .sort(([firstKey], [secondKey]) =>
      firstKey < secondKey ? -1 : firstKey > secondKey ? 1 : 0
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function buildTelegramInitDataHash(
  dataCheckString: string,
  botToken: string
): string {
  const secretKey = createHmac("sha256", TELEGRAM_WEB_APP_DATA_KEY)
    .update(botToken)
    .digest();

  return createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
}

function safeEqualHex(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first, "hex");
  const secondBuffer = Buffer.from(second, "hex");

  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
}

function parseTelegramMiniAppUser(
  rawUser: string | undefined
):
  | {
      ok: true;
      user: TelegramMiniAppUser;
    }
  | {
      message: string;
      ok: false;
    } {
  if (!rawUser) {
    return { message: "Telegram initData user is missing.", ok: false };
  }

  let json: unknown;

  try {
    json = JSON.parse(rawUser);
  } catch {
    return { message: "Telegram initData user is invalid JSON.", ok: false };
  }

  const parsedUser = telegramWebAppUserSchema.safeParse(json);
  if (!parsedUser.success) {
    return { message: "Telegram initData user is invalid.", ok: false };
  }

  const user = {
    firstName: parsedUser.data.first_name,
    id: parsedUser.data.id,
  };

  return parsedUser.data.username
    ? { ok: true, user: { ...user, username: parsedUser.data.username } }
    : { ok: true, user };
}
