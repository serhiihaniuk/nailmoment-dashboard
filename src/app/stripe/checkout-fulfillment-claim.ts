import type { StripeWebhookHandlerResult, StripeLogLevel } from "./types";

/**
 * Owns the Stripe Checkout Fulfillment claim lifecycle.
 *
 * This module is deliberately narrower than
 * `handlers/checkout-session-completed.ts`: it does not know how to create a
 * Ticket, Battle Ticket, QR code, finance row, payment row, or customer email.
 * Its job is to decide whether the current serverless worker is allowed to run
 * those side effects for one Stripe Checkout Session, and to record the final
 * claim state once the fulfillment callback returns.
 *
 * Keeping the store behind `StripeCheckoutFulfillmentClaimStore` makes the
 * lifecycle testable with fake adapters. Production uses
 * `checkout-fulfillment-claim-store.ts` to persist the same transitions in the
 * `stripe_webhook_event` table.
 */

/**
 * Durable lifecycle states stored for one Stripe webhook event delivery.
 *
 * `processing` is the only non-terminal state. `processed` and `ignored` are
 * terminal because rerunning them could duplicate records or turn an event that
 * was intentionally skipped into a customer-facing Ticket. `failed` is
 * retryable because Stripe may send the same event again after a 500 response.
 */
export type StripeCheckoutFulfillmentClaimStatus =
  | "failed"
  | "ignored"
  | "processed"
  | "processing";

/**
 * Terminal states that can be written after this worker owns the claim.
 */
export type StripeCheckoutFulfillmentClaimTerminalStatus = Exclude<
  StripeCheckoutFulfillmentClaimStatus,
  "processing"
>;

/**
 * Small event contract needed by the claim lifecycle.
 *
 * The lifecycle intentionally accepts this narrow shape instead of a full
 * `Stripe.Event` so tests can build realistic fake events without importing
 * Stripe payload types or ticket creation details.
 */
export interface StripeCheckoutFulfillmentEvent {
  id: string;
  type: string;
}

/**
 * Existing persisted claim state returned by the store adapter.
 */
export interface StripeCheckoutFulfillmentClaimRecord {
  status: StripeCheckoutFulfillmentClaimStatus;
  stripeSessionId: string | null;
  updatedAt: Date;
}

/**
 * Input for the first attempt to claim an event.
 *
 * Stores receive `claimedAt` from the lifecycle rather than creating their own
 * timestamp so race and retry behavior can be tested deterministically.
 */
export interface InsertStripeCheckoutFulfillmentClaimInput {
  claimedAt: Date;
  eventId: string;
  eventType: string;
  stripeSessionId: string;
}

/**
 * Input for reclaiming a retryable existing claim.
 *
 * The adapter must repeat the expected status/staleness condition in its write
 * operation. That is what prevents two concurrent retries from both reclaiming
 * the same webhook event.
 */
export interface ReclaimStripeCheckoutFulfillmentClaimInput {
  claimedAt: Date;
  eventId: string;
  previousStatus: "failed" | "processing";
  staleBefore: Date;
}

/**
 * Input for recording the final state after claimed fulfillment finishes.
 */
export interface MarkStripeCheckoutFulfillmentClaimInput {
  eventId: string;
  lastError: string | null;
  processedAt: Date | null;
  status: StripeCheckoutFulfillmentClaimTerminalStatus;
  statusReason: string | null;
  updatedAt: Date;
}

/**
 * Persistence boundary for the claim lifecycle.
 *
 * Production implements this with Drizzle and `stripe_webhook_event`. Tests use
 * in-memory fakes, which keeps idempotency and retry scenarios independent from
 * Ticket and Battle Ticket creation.
 */
export interface StripeCheckoutFulfillmentClaimStore {
  /**
   * Reads the existing claim after an insert conflict.
   */
  findClaim(
    eventId: string
  ): Promise<StripeCheckoutFulfillmentClaimRecord | null>;
  /**
   * Attempts to insert a new `processing` claim.
   *
   * Returns `false` when another worker or previous delivery already created
   * the row.
   */
  insertProcessingClaim(
    input: InsertStripeCheckoutFulfillmentClaimInput
  ): Promise<boolean>;
  /**
   * Writes a terminal status for the claim this worker owns.
   */
  markClaim(input: MarkStripeCheckoutFulfillmentClaimInput): Promise<void>;
  /**
   * Attempts to move a retryable existing claim back to `processing`.
   */
  reclaimProcessingClaim(
    input: ReclaimStripeCheckoutFulfillmentClaimInput
  ): Promise<boolean>;
}

type StripeCheckoutFulfillmentClaimLogger = (
  level: StripeLogLevel,
  step: string,
  message: string,
  context?: Record<string, unknown>
) => void;

export interface StripeCheckoutFulfillmentClaimedResult
  extends StripeWebhookHandlerResult {
  /**
   * Optional audit-table reason when the public route result should use a
   * shorter operator-facing reason than the persisted claim row.
   */
  claimStatusReason?: string;
}

/**
 * Dependencies for running one claim lifecycle around a fulfillment callback.
 */
interface RunStripeCheckoutFulfillmentClaimLifecycleInput {
  event: StripeCheckoutFulfillmentEvent;
  /**
   * Business fulfillment to run only after this worker owns the claim.
   */
  fulfillClaim: () => Promise<StripeCheckoutFulfillmentClaimedResult>;
  logger?: StripeCheckoutFulfillmentClaimLogger;
  now?: () => Date;
  store: StripeCheckoutFulfillmentClaimStore;
  stripeSessionId: string;
}

type StripeCheckoutFulfillmentClaim =
  | { kind: "claimed" }
  | {
      kind: "ignored";
      reason: string;
      stripeSessionId: string;
    };

/**
 * A webhook row left in `processing` probably means the server crashed, timed
 * out, or lost the process after claiming the event. After this window we allow
 * a later Stripe retry to reclaim the event and try again.
 */
export const PROCESSING_CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;

function noopLogger() {
  return undefined;
}

/**
 * Builds the shared correlation fields used by claim lifecycle logs.
 */
export function getStripeCheckoutFulfillmentEventContext({
  event,
  stripeSessionId,
}: {
  event: StripeCheckoutFulfillmentEvent;
  stripeSessionId: string;
}) {
  return {
    stripeEventId: event.id,
    stripeEventType: event.type,
    stripeSessionId,
  };
}

/**
 * Decides whether an existing webhook claim can be processed again.
 *
 * Reclaiming is allowed for failed attempts and stale processing claims. Fresh
 * processing claims stay locked because another worker may still be creating
 * the Ticket or Battle Ticket.
 */
export function shouldReclaimStripeCheckoutFulfillmentClaim(
  claim: Pick<StripeCheckoutFulfillmentClaimRecord, "status" | "updatedAt">,
  now: Date = new Date()
): boolean {
  if (claim.status === "failed") {
    return true;
  }

  if (claim.status !== "processing") {
    return false;
  }

  const staleBefore = new Date(now.getTime() - PROCESSING_CLAIM_STALE_AFTER_MS);
  return claim.updatedAt <= staleBefore;
}

/**
 * Claims the Stripe event before any customer-facing work happens.
 *
 * Stripe retries webhooks, and Vercel can run concurrent instances. The store
 * adapter is therefore the idempotency lock:
 *
 * 1. Try to insert a `processing` claim for this Stripe event id.
 * 2. If the insert wins, this worker owns fulfillment.
 * 3. If the row exists, ignore terminal or fresh `processing` states.
 * 4. Reclaim only failed or stale `processing` rows.
 * 5. If a reclaim race is lost, ignore the delivery as already claimed.
 */
async function claimStripeCheckoutFulfillmentEvent({
  event,
  logger,
  now,
  store,
  stripeSessionId,
}: {
  event: StripeCheckoutFulfillmentEvent;
  logger: StripeCheckoutFulfillmentClaimLogger;
  now: () => Date;
  store: StripeCheckoutFulfillmentClaimStore;
  stripeSessionId: string;
}): Promise<StripeCheckoutFulfillmentClaim> {
  const eventContext = getStripeCheckoutFulfillmentEventContext({
    event,
    stripeSessionId,
  });

  logger("info", "CLAIM", "Attempting to claim Stripe webhook event", {
    ...eventContext,
  });

  const claimedAt = now();
  const inserted = await store.insertProcessingClaim({
    claimedAt,
    eventId: event.id,
    eventType: event.type,
    stripeSessionId,
  });

  if (inserted) {
    logger("info", "CLAIM", "Claimed new Stripe webhook event row", {
      ...eventContext,
    });
    return { kind: "claimed" };
  }

  const existing = await store.findClaim(event.id);

  if (!existing) {
    logger("warn", "CLAIM", "Stripe webhook claim race lost", {
      ...eventContext,
      reason: "event_claim_race_lost",
    });
    return {
      kind: "ignored",
      reason: "event_claim_race_lost",
      stripeSessionId,
    };
  }

  if (shouldReclaimStripeCheckoutFulfillmentClaim(existing, claimedAt)) {
    logger("warn", "CLAIM", "Found stale Stripe webhook row, attempting reclaim", {
      ...eventContext,
      existingStatus: existing.status,
      existingUpdatedAt: existing.updatedAt,
    });

    const reclaimed = await store.reclaimProcessingClaim({
      claimedAt,
      eventId: event.id,
      previousStatus:
        existing.status === "failed" ? "failed" : "processing",
      staleBefore: new Date(
        claimedAt.getTime() - PROCESSING_CLAIM_STALE_AFTER_MS
      ),
    });

    if (reclaimed) {
      logger("info", "CLAIM", "Reclaimed stale Stripe webhook row", {
        ...eventContext,
        previousStatus: existing.status,
      });
      return { kind: "claimed" };
    }
  }

  logger("warn", "CLAIM", "Stripe webhook event already handled", {
    ...eventContext,
    existingStatus: existing.status,
    reason: `duplicate_${existing.status}`,
  });

  return {
    kind: "ignored",
    reason: `duplicate_${existing.status}`,
    stripeSessionId: existing.stripeSessionId ?? stripeSessionId,
  };
}

/**
 * Normalizes thrown values before storing them in the audit row.
 */
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Ensures every returned handler result carries the claim correlation ids.
 */
function normalizeHandlerResult(
  result: StripeWebhookHandlerResult,
  event: StripeCheckoutFulfillmentEvent,
  stripeSessionId: string
): StripeWebhookHandlerResult {
  return {
    ...result,
    stripeEventId: result.stripeEventId ?? event.id,
    stripeSessionId: result.stripeSessionId ?? stripeSessionId,
  };
}

/**
 * Runs a retry-safe claim lifecycle around Stripe Checkout Fulfillment.
 *
 * This is the high-level contract used by
 * `handleCheckoutSessionCompleted()`:
 *
 * - ignored claims return immediately and never call `fulfillClaim`;
 * - claimed callbacks that return `processed` mark the audit row `processed`;
 * - claimed callbacks that return `ignored` or `invalid` mark the row `ignored`;
 * - thrown errors mark the row `failed` and are rethrown so Stripe retries.
 *
 * The callback owns the product-specific branch work. This module owns only the
 * idempotency and claim-state transition language around that work.
 */
export async function runStripeCheckoutFulfillmentClaimLifecycle({
  event,
  fulfillClaim,
  logger = noopLogger,
  now = () => new Date(),
  store,
  stripeSessionId,
}: RunStripeCheckoutFulfillmentClaimLifecycleInput): Promise<StripeWebhookHandlerResult> {
  const claim = await claimStripeCheckoutFulfillmentEvent({
    event,
    logger,
    now,
    store,
    stripeSessionId,
  });

  if (claim.kind === "ignored") {
    return {
      kind: "ignored",
      reason: claim.reason,
      stripeEventId: event.id,
      stripeSessionId: claim.stripeSessionId,
    };
  }

  try {
    const claimedResult = await fulfillClaim();
    const { claimStatusReason, ...handlerResult } = claimedResult;
    const normalizedResult = normalizeHandlerResult(
      handlerResult,
      event,
      stripeSessionId
    );
    const terminalAt = now();

    await store.markClaim({
      eventId: event.id,
      lastError: null,
      processedAt: normalizedResult.kind === "processed" ? terminalAt : null,
      status:
        normalizedResult.kind === "processed" ? "processed" : "ignored",
      statusReason: claimStatusReason ?? normalizedResult.reason,
      updatedAt: terminalAt,
    });

    return normalizedResult;
  } catch (error) {
    await store.markClaim({
      eventId: event.id,
      lastError: getErrorMessage(error),
      processedAt: null,
      status: "failed",
      statusReason: null,
      updatedAt: now(),
    });
    throw error;
  }
}
