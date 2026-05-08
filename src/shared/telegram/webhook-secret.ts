import { timingSafeEqual } from "crypto";

export const TELEGRAM_WEBHOOK_SECRET_HEADER =
  "x-telegram-bot-api-secret-token";

export function isValidTelegramWebhookSecret({
  actual,
  expected,
}: {
  actual: string | null;
  expected: string;
}): boolean {
  if (!actual) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
