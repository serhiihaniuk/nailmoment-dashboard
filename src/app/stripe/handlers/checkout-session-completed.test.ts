import type Stripe from "stripe";
import { expect, test } from "vitest";
import { shouldReclaimStripeCheckoutFulfillmentClaim } from "../checkout-fulfillment-claim";
import { getCheckoutPaidAmount } from "../stripe-ticket-fulfillment";
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
  expect(
    resolveCheckoutSession(
      createSession({
        payment_status: "unpaid",
      })
    )
  ).toEqual({
    context: {
      expectedPaymentStatus: "paid",
      metadata: {
        event: "nailmoment",
        ticket_grade: "vip",
      },
      receivedPaymentStatus: "unpaid",
    },
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
    context: {
      allowedTicketGrades: ["standard", "maxi", "vip"],
      metadata: {
        event: "nailmoment",
        ticket_grade: "broken",
      },
      receivedTicketGrade: "broken",
    },
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

test("getCheckoutPaidAmount uses Stripe amount_total in major currency units", () => {
  expect(getCheckoutPaidAmount(createSession({ amount_total: 94900 }), "vip")).toBe(
    "949.00"
  );
});

test("getCheckoutPaidAmount falls back to grade price when Stripe amount is absent", () => {
  expect(getCheckoutPaidAmount(createSession({ amount_total: null }), "maxi")).toBe(
    "590.00"
  );
});

test("shouldReclaimStripeCheckoutFulfillmentClaim reclaims failed events", () => {
  expect(
    shouldReclaimStripeCheckoutFulfillmentClaim({
      status: "failed",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })
  ).toBe(true);
});

test("shouldReclaimStripeCheckoutFulfillmentClaim reclaims stale processing events", () => {
  const now = new Date("2026-01-01T00:10:00.000Z");

  expect(
    shouldReclaimStripeCheckoutFulfillmentClaim(
      {
        status: "processing",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      now
    )
  ).toBe(true);
});

test("shouldReclaimStripeCheckoutFulfillmentClaim keeps fresh processing events locked", () => {
  const now = new Date("2026-01-01T00:04:00.000Z");

  expect(
    shouldReclaimStripeCheckoutFulfillmentClaim(
      {
        status: "processing",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      now
    )
  ).toBe(false);
});
