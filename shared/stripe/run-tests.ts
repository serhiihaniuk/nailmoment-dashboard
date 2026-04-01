import assert from "node:assert/strict";
import Stripe from "stripe";

function createSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: "cs_test",
    metadata: {
      event: "nailmoment",
      ticket_grade: "vip",
      ...overrides.metadata,
    },
    payment_status: "paid",
    ...overrides,
  } as Stripe.Checkout.Session;
}

async function main() {
  process.env.DATABASE_URL ??= "postgresql://user:pass@localhost/test";
  process.env.LOGTAIL_TOKEN ??= "test";
  process.env.LOGTAIL_URL ??= "https://example.com";
  process.env.RESEND_API_KEY ??= "test";

  const [{ resolveCheckoutSession }, { mapCheckoutCustomer }, { createStripeWebhookRoute }, verifyWebhook] =
    await Promise.all([
      import("./handlers/checkout-session-completed"),
      import("./map-checkout-customer"),
      import("./route-handler"),
      import("./verify-webhook"),
    ]);
  const {
    createStripeWebhookVerifier,
    readStripeWebhookConfig,
    validateCheckoutSessionCompletedEvent,
  } = verifyWebhook;

  const customerSession = {
    custom_fields: [
      {
        key: "full_name",
        text: { value: "Anna Example" },
      },
      {
        key: "instagram",
        text: { value: "@anna_example" },
      },
    ],
    customer_details: {
      email: "anna@example.com",
      name: "Fallback Name",
      phone: "+48123123123",
    },
    metadata: {},
  } as Stripe.Checkout.Session;

  assert.deepEqual(mapCheckoutCustomer(customerSession), {
    email: "anna@example.com",
    instagram: "anna_example",
    name: "Anna Example",
    phone: "+48123123123",
  });

  const configResult = readStripeWebhookConfig({
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_ALLOWED_CURRENCIES: "pln, eur",
    STRIPE_WEBHOOK_ALLOWED_PRICE_IDS: "price_a,price_b",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(configResult.ok, true);

  if (configResult.ok) {
    assert.deepEqual(configResult.config.allowedCurrencies, ["pln", "eur"]);
    assert.deepEqual(configResult.config.allowedPriceIds, [
      "price_a",
      "price_b",
    ]);
    assert.equal(configResult.config.expectedLivemode, false);
  }

  const currencyValidation = await validateCheckoutSessionCompletedEvent(
    {
      currency: "usd",
      id: "cs_test_currency",
      livemode: false,
    } as Stripe.Checkout.Session,
    {
      allowedCurrencies: ["pln"],
      allowedPriceIds: [],
      expectedLivemode: false,
    },
    {
      checkout: {
        sessions: {
          listLineItems: async () => ({ data: [] }),
        },
      },
    } as unknown as Pick<Stripe, "checkout">
  );

  assert.equal(currencyValidation.ok, false);

  const verifyStripeWebhookRequest = createStripeWebhookVerifier({
    env: {
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    } as unknown as NodeJS.ProcessEnv,
  });

  const signatureFailure = await verifyStripeWebhookRequest(
    new Request("https://example.com/api/webhooks/stripe", {
      body: JSON.stringify({ ok: true }),
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid",
      },
      method: "POST",
    })
  );

  assert.equal(signatureFailure.kind, "rejected");
  if (signatureFailure.kind === "rejected") {
    assert.deepEqual(signatureFailure.body, { error: "Bad signature" });
    assert.equal(signatureFailure.status, 400);
  }

  const duplicateRoute = createStripeWebhookRoute({
    flushLogs: async () => undefined,
    handlers: {
      "checkout.session.completed": async () => ({
        kind: "ignored",
        reason: "duplicate_processed",
        stripeEventId: "evt_duplicate",
        stripeSessionId: "cs_test_duplicate",
      }),
    },
    logger: () => undefined,
    verifyRequest: async () => ({
      event: {
        data: {
          object: {
            id: "cs_test_duplicate",
          },
        },
        id: "evt_duplicate",
        type: "checkout.session.completed",
      } as unknown as Stripe.Event,
      kind: "verified",
    }),
  });

  const duplicateResponse = await duplicateRoute(
    new Request("https://example.com/api/webhooks/stripe", { method: "POST" })
  );

  assert.equal(duplicateResponse.status, 200);
  assert.deepEqual(await duplicateResponse.json(), { received: true });

  assert.deepEqual(
    resolveCheckoutSession(
      createSession({
        payment_status: "unpaid",
      })
    ),
    {
      kind: "ignored",
      reason: "unpaid_session",
    }
  );

  assert.deepEqual(
    resolveCheckoutSession(
      createSession({
        metadata: {
          event: "nailmoment",
          type: "battle",
        },
      })
    ),
    {
      kind: "battle",
    }
  );

  assert.deepEqual(
    resolveCheckoutSession(
      createSession({
        metadata: {
          event: "nailmoment",
          ticket_grade: "broken",
        },
      })
    ),
    {
      kind: "invalid",
      reason: "invalid_ticket_grade",
    }
  );

  assert.deepEqual(resolveCheckoutSession(createSession()), {
    kind: "ticket",
    ticketGrade: "vip",
  });

  console.log("Stripe tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
