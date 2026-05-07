import { expect, test } from "vitest";
import {
  runStripeCheckoutFulfillmentClaimLifecycle,
  type MarkStripeCheckoutFulfillmentClaimInput,
  type ReclaimStripeCheckoutFulfillmentClaimInput,
  type StripeCheckoutFulfillmentClaimRecord,
  type StripeCheckoutFulfillmentClaimStore,
  type StripeCheckoutFulfillmentEvent,
} from "./checkout-fulfillment-claim";

const checkoutEvent = {
  id: "evt_checkout",
  type: "checkout.session.completed",
} satisfies StripeCheckoutFulfillmentEvent;

function createClock(...dates: Date[]) {
  let index = 0;

  return () => {
    const next = dates[index];

    if (!next) {
      throw new Error("Test clock exhausted");
    }

    index += 1;
    return next;
  };
}

class FakeClaimStore implements StripeCheckoutFulfillmentClaimStore {
  readonly markedClaims: MarkStripeCheckoutFulfillmentClaimInput[] = [];
  readonly reclaimedClaims: ReclaimStripeCheckoutFulfillmentClaimInput[] = [];

  private readonly claims = new Map<
    string,
    StripeCheckoutFulfillmentClaimRecord
  >();

  constructor(
    initialClaims: Array<{
      eventId: string;
      record: StripeCheckoutFulfillmentClaimRecord;
    }> = []
  ) {
    for (const initialClaim of initialClaims) {
      this.claims.set(initialClaim.eventId, initialClaim.record);
    }
  }

  async findClaim(eventId: string) {
    return this.getClaim(eventId);
  }

  getClaim(eventId: string) {
    const claim = this.claims.get(eventId);
    return claim ? { ...claim } : null;
  }

  async insertProcessingClaim(input: {
    claimedAt: Date;
    eventId: string;
    eventType: string;
    stripeSessionId: string;
  }) {
    if (this.claims.has(input.eventId)) {
      return false;
    }

    this.claims.set(input.eventId, {
      status: "processing",
      stripeSessionId: input.stripeSessionId,
      updatedAt: input.claimedAt,
    });

    return true;
  }

  async markClaim(input: MarkStripeCheckoutFulfillmentClaimInput) {
    this.markedClaims.push(input);
    const existing = this.claims.get(input.eventId);

    if (!existing) {
      return;
    }

    this.claims.set(input.eventId, {
      status: input.status,
      stripeSessionId: existing.stripeSessionId,
      updatedAt: input.updatedAt,
    });
  }

  async reclaimProcessingClaim(
    input: ReclaimStripeCheckoutFulfillmentClaimInput
  ) {
    this.reclaimedClaims.push(input);
    const existing = this.claims.get(input.eventId);

    if (!existing) {
      return false;
    }

    if (input.previousStatus === "failed") {
      if (existing.status !== "failed") {
        return false;
      }
    } else {
      if (existing.status !== "processing") {
        return false;
      }

      if (existing.updatedAt > input.staleBefore) {
        return false;
      }
    }

    this.claims.set(input.eventId, {
      status: "processing",
      stripeSessionId: existing.stripeSessionId,
      updatedAt: input.claimedAt,
    });

    return true;
  }
}

test("claim lifecycle processes a first checkout once", async () => {
  const store = new FakeClaimStore();
  const claimedAt = new Date("2026-01-01T00:00:00.000Z");
  const terminalAt = new Date("2026-01-01T00:00:01.000Z");
  let fulfillmentCalls = 0;

  const result = await runStripeCheckoutFulfillmentClaimLifecycle({
    event: checkoutEvent,
    fulfillClaim: async () => {
      fulfillmentCalls += 1;
      return {
        claimStatusReason: "ticket_created_with_payment",
        kind: "processed",
        reason: "ticket_created",
      };
    },
    now: createClock(claimedAt, terminalAt),
    store,
    stripeSessionId: "cs_first",
  });

  expect(result).toEqual({
    kind: "processed",
    reason: "ticket_created",
    stripeEventId: "evt_checkout",
    stripeSessionId: "cs_first",
  });
  expect(fulfillmentCalls).toBe(1);
  expect(store.markedClaims).toEqual([
    {
      eventId: "evt_checkout",
      lastError: null,
      processedAt: terminalAt,
      status: "processed",
      statusReason: "ticket_created_with_payment",
      updatedAt: terminalAt,
    },
  ]);
});

test("claim lifecycle ignores replayed processed checkouts", async () => {
  const store = new FakeClaimStore([
    {
      eventId: "evt_checkout",
      record: {
        status: "processed",
        stripeSessionId: "cs_replay",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
  ]);
  let fulfillmentCalls = 0;

  const result = await runStripeCheckoutFulfillmentClaimLifecycle({
    event: checkoutEvent,
    fulfillClaim: async () => {
      fulfillmentCalls += 1;
      return {
        kind: "processed",
        reason: "ticket_created",
      };
    },
    now: createClock(new Date("2026-01-01T00:00:10.000Z")),
    store,
    stripeSessionId: "cs_fallback",
  });

  expect(result).toEqual({
    kind: "ignored",
    reason: "duplicate_processed",
    stripeEventId: "evt_checkout",
    stripeSessionId: "cs_replay",
  });
  expect(fulfillmentCalls).toBe(0);
  expect(store.markedClaims).toEqual([]);
});

test("claim lifecycle retries failed checkouts through the fulfillment adapter", async () => {
  const store = new FakeClaimStore([
    {
      eventId: "evt_checkout",
      record: {
        status: "failed",
        stripeSessionId: "cs_retry",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
  ]);
  const claimedAt = new Date("2026-01-01T00:01:00.000Z");
  const terminalAt = new Date("2026-01-01T00:01:01.000Z");
  let fulfillmentCalls = 0;

  const result = await runStripeCheckoutFulfillmentClaimLifecycle({
    event: checkoutEvent,
    fulfillClaim: async () => {
      fulfillmentCalls += 1;
      return {
        kind: "processed",
        reason: "battle_ticket_created",
      };
    },
    now: createClock(claimedAt, terminalAt),
    store,
    stripeSessionId: "cs_retry",
  });

  expect(result.kind).toBe("processed");
  expect(fulfillmentCalls).toBe(1);
  expect(store.reclaimedClaims).toEqual([
    {
      claimedAt,
      eventId: "evt_checkout",
      previousStatus: "failed",
      staleBefore: new Date("2025-12-31T23:56:00.000Z"),
    },
  ]);
  expect(store.markedClaims).toEqual([
    {
      eventId: "evt_checkout",
      lastError: null,
      processedAt: terminalAt,
      status: "processed",
      statusReason: "battle_ticket_created",
      updatedAt: terminalAt,
    },
  ]);
});

test("claim lifecycle leaves fresh already-claimed checkouts alone", async () => {
  const store = new FakeClaimStore([
    {
      eventId: "evt_checkout",
      record: {
        status: "processing",
        stripeSessionId: "cs_processing",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
  ]);
  let fulfillmentCalls = 0;

  const result = await runStripeCheckoutFulfillmentClaimLifecycle({
    event: checkoutEvent,
    fulfillClaim: async () => {
      fulfillmentCalls += 1;
      return {
        kind: "processed",
        reason: "ticket_created",
      };
    },
    now: createClock(new Date("2026-01-01T00:04:00.000Z")),
    store,
    stripeSessionId: "cs_processing",
  });

  expect(result).toEqual({
    kind: "ignored",
    reason: "duplicate_processing",
    stripeEventId: "evt_checkout",
    stripeSessionId: "cs_processing",
  });
  expect(fulfillmentCalls).toBe(0);
  expect(store.reclaimedClaims).toEqual([]);
  expect(store.markedClaims).toEqual([]);
});

test("claim lifecycle marks claimed fulfillment failures as retryable", async () => {
  const store = new FakeClaimStore();
  const claimedAt = new Date("2026-01-01T00:00:00.000Z");
  const failedAt = new Date("2026-01-01T00:00:02.000Z");

  await expect(
    runStripeCheckoutFulfillmentClaimLifecycle({
      event: checkoutEvent,
      fulfillClaim: async () => {
        throw new Error("ticket insert failed");
      },
      now: createClock(claimedAt, failedAt),
      store,
      stripeSessionId: "cs_failed",
    })
  ).rejects.toThrow("ticket insert failed");

  expect(store.markedClaims).toEqual([
    {
      eventId: "evt_checkout",
      lastError: "ticket insert failed",
      processedAt: null,
      status: "failed",
      statusReason: null,
      updatedAt: failedAt,
    },
  ]);
});
