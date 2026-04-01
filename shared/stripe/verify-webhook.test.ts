import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
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

  assert.equal(result.ok, true);

  if (!result.ok) {
    return;
  }

  assert.deepEqual(result.config.allowedCurrencies, ["pln", "eur"]);
  assert.deepEqual(result.config.allowedPriceIds, ["price_a", "price_b"]);
  assert.equal(result.config.expectedLivemode, false);
});

test("validateCheckoutSessionCompletedEvent rejects unexpected currency", async () => {
  const session = {
    currency: "usd",
    id: "cs_test_currency",
    livemode: false,
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

  assert.equal(result.ok, false);

  if (result.ok) {
    return;
  }

  assert.equal(result.rejection.status, 200);
  assert.equal(result.rejection.logMessage, "Ignoring Stripe session with unexpected currency");
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

  assert.equal(result.kind, "rejected");

  if (result.kind !== "rejected") {
    return;
  }

  assert.deepEqual(result.body, { error: "Bad signature" });
  assert.equal(result.logLevel, "error");
  assert.equal(result.logMessage, "Signature verification failed");
  assert.equal(result.status, 400);
  assert.ok(result.logContext?.error instanceof Error);
});
