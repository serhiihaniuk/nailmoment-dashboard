import type { StripeWebhookHandlerResult, StripeLogLevel } from "./types";

export type StripeCheckoutFulfillmentClaimStatus =
  | "failed"
  | "ignored"
  | "processed"
  | "processing";

export type StripeCheckoutFulfillmentClaimTerminalStatus = Exclude<
  StripeCheckoutFulfillmentClaimStatus,
  "processing"
>;

export interface StripeCheckoutFulfillmentEvent {
  id: string;
  type: string;
}

export interface StripeCheckoutFulfillmentClaimRecord {
  status: StripeCheckoutFulfillmentClaimStatus;
  stripeSessionId: string | null;
  updatedAt: Date;
}

export interface InsertStripeCheckoutFulfillmentClaimInput {
  claimedAt: Date;
  eventId: string;
  eventType: string;
  stripeSessionId: string;
}

export interface ReclaimStripeCheckoutFulfillmentClaimInput {
  claimedAt: Date;
  eventId: string;
  previousStatus: "failed" | "processing";
  staleBefore: Date;
}

export interface MarkStripeCheckoutFulfillmentClaimInput {
  eventId: string;
  lastError: string | null;
  processedAt: Date | null;
  status: StripeCheckoutFulfillmentClaimTerminalStatus;
  statusReason: string | null;
  updatedAt: Date;
}

export interface StripeCheckoutFulfillmentClaimStore {
  findClaim(
    eventId: string
  ): Promise<StripeCheckoutFulfillmentClaimRecord | null>;
  insertProcessingClaim(
    input: InsertStripeCheckoutFulfillmentClaimInput
  ): Promise<boolean>;
  markClaim(input: MarkStripeCheckoutFulfillmentClaimInput): Promise<void>;
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
  claimStatusReason?: string;
}

interface RunStripeCheckoutFulfillmentClaimLifecycleInput {
  event: StripeCheckoutFulfillmentEvent;
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

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
