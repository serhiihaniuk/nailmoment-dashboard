import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { resolveCheckoutSession } from "./checkout-session-completed";

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

test("resolveCheckoutSession ignores unpaid sessions", () => {
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
});

test("resolveCheckoutSession routes battle sessions", () => {
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
});

test("resolveCheckoutSession rejects invalid ticket grades", () => {
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
});

test("resolveCheckoutSession returns ticket branch for valid grades", () => {
  assert.deepEqual(resolveCheckoutSession(createSession()), {
    kind: "ticket",
    ticketGrade: "vip",
  });
});
