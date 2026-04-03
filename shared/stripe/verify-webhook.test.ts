import Stripe from "stripe";
import { expect, test } from "vitest";
import {
  createStripeWebhookVerifier,
  readStripeWebhookConfig,
  validateCheckoutSessionCompletedEvent,
} from "./verify-webhook";

test("readStripeWebhookConfig parses optional guards and infers livemode", () => {
  const result = readStripeWebhookConfig({
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_ALLOWED_CURRENCIES: "pln, eur",
    STRIPE_WEBHOOK_ALLOWED_PRICE_IDS: "price_a,price_b",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
  } as unknown as NodeJS.ProcessEnv);

  expect(result.ok).toBe(true);

  if (!result.ok) {
    return;
  }

  expect(result.config.allowedCurrencies).toEqual(["pln", "eur"]);
  expect(result.config.allowedPriceIds).toEqual(["price_a", "price_b"]);
  expect(result.config.expectedLivemode).toBe(false);
});

test("readStripeWebhookConfig treats restricted live keys as livemode", () => {
  const result = readStripeWebhookConfig({
    STRIPE_SECRET_KEY: "rk_live_123",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
  } as unknown as NodeJS.ProcessEnv);

  expect(result.ok).toBe(true);

  if (!result.ok) {
    return;
  }

  expect(result.config.expectedLivemode).toBe(true);
});

test("validateCheckoutSessionCompletedEvent rejects unexpected currency", async () => {
  const session = {
    currency: "usd",
    id: "cs_test_currency",
    livemode: false,
    mode: "payment",
  } as Stripe.Checkout.Session;
  const stripe = {
    checkout: {
      sessions: {
        listLineItems: async () => ({ data: [] }),
      },
    },
  } as unknown as Pick<Stripe, "checkout">;

  const result = await validateCheckoutSessionCompletedEvent(
    session,
    {
      allowedCurrencies: ["pln"],
      allowedPriceIds: [],
      expectedLivemode: false,
    },
    stripe
  );

  expect(result.ok).toBe(false);

  if (result.ok) {
    return;
  }

  expect(result.rejection.status).toBe(200);
  expect(result.rejection.logMessage).toBe(
    "VERIFY Ignoring Stripe session with unexpected currency"
  );
});

test("validateCheckoutSessionCompletedEvent rejects non-payment checkout mode", async () => {
  const session = {
    id: "cs_test_subscription",
    livemode: false,
    mode: "subscription",
  } as Stripe.Checkout.Session;
  const stripe = {
    checkout: {
      sessions: {
        listLineItems: async () => ({ data: [] }),
      },
    },
  } as unknown as Pick<Stripe, "checkout">;

  const result = await validateCheckoutSessionCompletedEvent(
    session,
    {
      allowedCurrencies: [],
      allowedPriceIds: [],
      expectedLivemode: false,
    },
    stripe
  );

  expect(result.ok).toBe(false);

  if (result.ok) {
    return;
  }

  expect(result.rejection.status).toBe(200);
  expect(result.rejection.logMessage).toBe(
    "VERIFY Ignoring Stripe session with unexpected checkout mode"
  );
});

test("verifyStripeWebhookRequest rejects invalid signatures", async () => {
  const verifyStripeWebhookRequest = createStripeWebhookVerifier({
    env: {
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    } as unknown as NodeJS.ProcessEnv,
  });

  const request = new Request("https://example.com/api/webhooks/stripe", {
    body: JSON.stringify({ ok: true }),
    headers: {
      "content-type": "application/json",
      "stripe-signature": "invalid",
    },
    method: "POST",
  });

  const result = await verifyStripeWebhookRequest(request);

  expect(result.kind).toBe("rejected");

  if (result.kind !== "rejected") {
    return;
  }

  expect(result.body).toEqual({ error: "Bad signature" });
  expect(result.logLevel).toBe("error");
  expect(result.logMessage).toBe("Signature verification failed");
  expect(result.status).toBe(400);
  expect(result.logContext?.error).toBeInstanceOf(Error);
});

test("verifyStripeWebhookRequest does not log full headers when signature is missing", async () => {
  const verifyStripeWebhookRequest = createStripeWebhookVerifier({
    env: {
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    } as unknown as NodeJS.ProcessEnv,
  });

  const request = new Request("https://example.com/api/webhooks/stripe", {
    body: JSON.stringify({ ok: true }),
    headers: {
      "content-type": "application/json",
      cookie: "session=secret",
      "user-agent": "test-agent",
    },
    method: "POST",
  });

  const result = await verifyStripeWebhookRequest(request);

  expect(result.kind).toBe("rejected");

  if (result.kind !== "rejected") {
    return;
  }

  expect(result.logContext).toEqual({
    contentType: "application/json",
    userAgent: "test-agent",
  });
});
