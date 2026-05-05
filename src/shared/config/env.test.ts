import { describe, expect, test } from "vitest";
import {
  readOptionalEnv,
  readOptionalLogtailConfig,
  readRequiredEnv,
  readStripeWebhookEnv,
} from "./env";

function testEnv(values: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...values,
  };
}

describe("env readers", () => {
  test("trims optional env values and treats blank values as unset", () => {
    expect(readOptionalEnv("TOKEN", testEnv({ TOKEN: "  value  " }))).toBe("value");
    expect(readOptionalEnv("TOKEN", testEnv({ TOKEN: "   " }))).toBeUndefined();
  });

  test("throws only when a required key is requested", () => {
    expect(
      readRequiredEnv("DATABASE_URL", testEnv({
        DATABASE_URL: " postgres://local ",
      }))
    ).toBe("postgres://local");

    expect(() => readRequiredEnv("DATABASE_URL", testEnv({}))).toThrow(
      "DATABASE_URL is not set"
    );
  });

  test("keeps unrelated secrets optional for scoped consumers", () => {
    expect(readStripeWebhookEnv(testEnv({ STRIPE_WEBHOOK_SECRET: " whsec_123 " })))
      .toEqual({
        allowedCurrencies: undefined,
        allowedPriceIds: undefined,
        expectLivemode: undefined,
        secretKey: undefined,
        webhookSecret: "whsec_123",
      });

    expect(readOptionalLogtailConfig(testEnv({ LOGTAIL_TOKEN: " token " }))).toEqual({
      endpoint: undefined,
      token: "token",
    });
  });
});
