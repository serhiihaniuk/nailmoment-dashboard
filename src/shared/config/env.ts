type Env = NodeJS.ProcessEnv;

/**
 * Typed environment accessors.
 *
 * Consumers should call a scoped reader instead of touching process.env
 * directly. That keeps imports lazy: the email module requires Resend only when
 * it sends email, while Stripe/Telegram/Logtail can validate their own config.
 */
function readString(env: Env, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Read an optional env var after trimming blank strings to undefined. */
export function readOptionalEnv(key: string, env: Env = process.env) {
  return readString(env, key);
}

/** Read a required env var at the point a consumer actually needs it. */
export function readRequiredEnv(key: string, env: Env = process.env) {
  const value = readString(env, key);

  if (!value) {
    throw new Error(`${key} is not set`);
  }

  return value;
}

// Database bootstrapping has two names because Drizzle CLI and runtime use
// different env vars in this project.
export function readDatabaseUrl(env: Env = process.env) {
  return readRequiredEnv("DATABASE_URL", env);
}

export function readPostgresUrl(env: Env = process.env) {
  return readRequiredEnv("POSTGRES_URL", env);
}

export function readResendApiKey(env: Env = process.env) {
  return readRequiredEnv("RESEND_API_KEY", env);
}

export function readOptionalLogtailConfig(env: Env = process.env) {
  return {
    endpoint: readOptionalEnv("LOGTAIL_URL", env),
    token: readOptionalEnv("LOGTAIL_TOKEN", env),
  };
}

export function readTelegramAudienceVoteBotToken(env: Env = process.env) {
  return readRequiredEnv("TG_AUDIENCE_VOTE_BOT_TOKEN", env);
}

export function readTelegramAudienceVoteWebhookSecret(env: Env = process.env) {
  return readRequiredEnv("TG_AUDIENCE_VOTE_WEBHOOK_SECRET", env);
}

export function readTelegramAudienceVoteMiniAppUrl(env: Env = process.env) {
  return readRequiredEnv("TG_AUDIENCE_VOTE_MINI_APP_URL", env);
}

export function readTelegramAudienceVoteProcessorSecret(env: Env = process.env) {
  return readRequiredEnv("TG_AUDIENCE_VOTE_PROCESSOR_SECRET", env);
}

export function readTelegramAudienceVoteOperatorTelegramIds(
  env: Env = process.env
) {
  return (
    readOptionalEnv("TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_IDS", env) ??
    readRequiredEnv("TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_ID", env)
  );
}

export function readVercelUrl(env: Env = process.env) {
  return readOptionalEnv("VERCEL_URL", env);
}

/**
 * Stripe webhook env reader.
 *
 * Webhook verification needs two required secrets at request time:
 *
 * - `STRIPE_SECRET_KEY` to create a Stripe SDK client;
 * - `STRIPE_WEBHOOK_SECRET` to verify the signed raw request body.
 *
 * The other vars are optional guards. They let an environment reject a checkout
 * that is signed by Stripe but belongs to the wrong currency, wrong live/test
 * mode, or wrong Price id before ticket/finance side effects run.
 */
export function readStripeWebhookEnv(env: Env = process.env) {
  return {
    allowedCurrencies: readOptionalEnv("STRIPE_WEBHOOK_ALLOWED_CURRENCIES", env),
    allowedPriceIds: readOptionalEnv("STRIPE_WEBHOOK_ALLOWED_PRICE_IDS", env),
    expectLivemode: readOptionalEnv("STRIPE_WEBHOOK_EXPECT_LIVEMODE", env),
    secretKey: readOptionalEnv("STRIPE_SECRET_KEY", env),
    webhookSecret: readOptionalEnv("STRIPE_WEBHOOK_SECRET", env),
  };
}
