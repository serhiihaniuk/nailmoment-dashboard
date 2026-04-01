import type Stripe from "stripe";
import { expect, test } from "vitest";
import {
  resolveCheckoutSession,
  shouldReclaimStripeWebhookEvent,
} from "./checkout-session-completed";

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
  expect(
    resolveCheckoutSession(
      createSession({
        payment_status: "unpaid",
      })
    )
  ).toEqual({
    kind: "ignored",
    reason: "unpaid_session",
  });
});

test("resolveCheckoutSession routes battle sessions", () => {
  expect(
    resolveCheckoutSession(
      createSession({
        metadata: {
          event: "nailmoment",
          type: "battle",
        },
      })
    )
  ).toEqual({
    kind: "battle",
  });
});

test("resolveCheckoutSession rejects invalid ticket grades", () => {
  expect(
    resolveCheckoutSession(
      createSession({
        metadata: {
          event: "nailmoment",
          ticket_grade: "broken",
        },
      })
    )
  ).toEqual({
    kind: "invalid",
    reason: "invalid_ticket_grade",
  });
});

test("resolveCheckoutSession returns ticket branch for valid grades", () => {
  expect(resolveCheckoutSession(createSession())).toEqual({
    kind: "ticket",
    ticketGrade: "vip",
  });
});

test("shouldReclaimStripeWebhookEvent reclaims failed events", () => {
  expect(
    shouldReclaimStripeWebhookEvent({
      status: "failed",
      updated_at: new Date("2026-01-01T00:00:00.000Z"),
    })
  ).toBe(true);
});

test("shouldReclaimStripeWebhookEvent reclaims stale processing events", () => {
  const now = new Date("2026-01-01T00:10:00.000Z");

  expect(
    shouldReclaimStripeWebhookEvent(
      {
        status: "processing",
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
      now
    )
  ).toBe(true);
});

test("shouldReclaimStripeWebhookEvent keeps fresh processing events locked", () => {
  const now = new Date("2026-01-01T00:04:00.000Z");

  expect(
    shouldReclaimStripeWebhookEvent(
      {
        status: "processing",
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
      now
    )
  ).toBe(false);
});
