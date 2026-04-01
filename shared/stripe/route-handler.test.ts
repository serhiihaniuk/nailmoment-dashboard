import type Stripe from "stripe";
import { expect, test } from "vitest";
import { createStripeWebhookRoute } from "./route-handler";

test("createStripeWebhookRoute returns 200 for duplicate deliveries", async () => {
  const event = {
    data: {
      object: {
        id: "cs_test_duplicate",
      },
    },
    id: "evt_duplicate",
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;

  const POST = createStripeWebhookRoute({
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
      event,
      kind: "verified",
    }),
  });

  const response = await POST(
    new Request("https://example.com/api/webhooks/stripe", { method: "POST" })
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: true });
});
