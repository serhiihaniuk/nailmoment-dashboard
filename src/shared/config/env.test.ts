import { describe, expect, test } from "vitest";
import {
  readTelegramAudienceVoteBotToken,
  readTelegramAudienceVoteMiniAppUrl,
  readTelegramAudienceVoteOperatorTelegramId,
  readTelegramAudienceVoteProcessorSecret,
  readTelegramAudienceVoteWebhookSecret,
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

  test("reads scoped Audience Vote Telegram bot config", () => {
    const env = testEnv({
      TG_AUDIENCE_VOTE_BOT_TOKEN: " token ",
      TG_AUDIENCE_VOTE_MINI_APP_URL: " https://example.com/audience-vote ",
      TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_ID: " 299445418 ",
      TG_AUDIENCE_VOTE_PROCESSOR_SECRET: " processor-secret ",
      TG_AUDIENCE_VOTE_WEBHOOK_SECRET: " webhook-secret ",
    });

    expect(readTelegramAudienceVoteBotToken(env)).toBe("token");
    expect(readTelegramAudienceVoteMiniAppUrl(env)).toBe(
      "https://example.com/audience-vote"
    );
    expect(readTelegramAudienceVoteOperatorTelegramId(env)).toBe("299445418");
    expect(readTelegramAudienceVoteProcessorSecret(env)).toBe(
      "processor-secret"
    );
    expect(readTelegramAudienceVoteWebhookSecret(env)).toBe("webhook-secret");
  });
});
