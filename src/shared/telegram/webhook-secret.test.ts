import { describe, expect, test } from "vitest";

import { isValidTelegramWebhookSecret } from "./webhook-secret";

describe("Telegram webhook secret validation", () => {
  test("accepts the expected secret", () => {
    expect(
      isValidTelegramWebhookSecret({
        actual: "dev-webhook-secret",
        expected: "dev-webhook-secret",
      })
    ).toBe(true);
  });

  test("rejects a missing secret", () => {
    expect(
      isValidTelegramWebhookSecret({
        actual: null,
        expected: "dev-webhook-secret",
      })
    ).toBe(false);
  });

  test("rejects a different secret", () => {
    expect(
      isValidTelegramWebhookSecret({
        actual: "different-webhook-secret",
        expected: "dev-webhook-secret",
      })
    ).toBe(false);
  });

  test("rejects a secret with the same prefix but different length", () => {
    expect(
      isValidTelegramWebhookSecret({
        actual: "dev-webhook-secret-extra",
        expected: "dev-webhook-secret",
      })
    ).toBe(false);
  });
});
