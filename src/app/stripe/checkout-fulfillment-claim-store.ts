import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { stripeWebhookEventTable } from "@/shared/db/schema";
import type {
  ReclaimStripeCheckoutFulfillmentClaimInput,
  StripeCheckoutFulfillmentClaimStore,
} from "./checkout-fulfillment-claim";

/**
 * Production persistence adapter for Stripe Checkout Fulfillment claims.
 *
 * The lifecycle module owns the state machine. This adapter owns the Drizzle
 * details for storing that state in `stripe_webhook_event`, whose primary key
 * is the Stripe event id. Keeping those responsibilities separate lets tests
 * fake the store while production still uses database constraints for the
 * actual idempotency lock.
 */

/**
 * Builds the race-safe `WHERE` clause for reclaiming an existing claim.
 *
 * The lifecycle already checked that a row looked retryable, but this condition
 * repeats the important facts inside the update. If two Stripe retries arrive
 * together, only one update can still match the expected status/staleness.
 */
function getReclaimWhereClause(
  input: ReclaimStripeCheckoutFulfillmentClaimInput
) {
  if (input.previousStatus === "failed") {
    return and(
      eq(stripeWebhookEventTable.id, input.eventId),
      eq(stripeWebhookEventTable.status, "failed")
    );
  }

  return and(
    eq(stripeWebhookEventTable.id, input.eventId),
    eq(stripeWebhookEventTable.status, "processing"),
    lte(stripeWebhookEventTable.updated_at, input.staleBefore)
  );
}

/**
 * Creates the Drizzle-backed claim store used by the live webhook handler.
 *
 * Each method returns only the narrow data the lifecycle needs, rather than
 * leaking the full database row shape back into Stripe business logic.
 */
export function createStripeCheckoutFulfillmentClaimStore(): StripeCheckoutFulfillmentClaimStore {
  return {
    /**
     * Reads the existing audit row after an insert conflict.
     */
    async findClaim(eventId) {
      const [existing] = await db
        .select({
          status: stripeWebhookEventTable.status,
          stripeSessionId: stripeWebhookEventTable.stripe_session_id,
          updatedAt: stripeWebhookEventTable.updated_at,
        })
        .from(stripeWebhookEventTable)
        .where(eq(stripeWebhookEventTable.id, eventId))
        .limit(1);

      return existing ?? null;
    },
    /**
     * Inserts the first `processing` row.
     *
     * `onConflictDoNothing()` makes Postgres decide which concurrent worker owns
     * the Stripe event. A successful insert means this worker may run
     * fulfillment; an empty result means the lifecycle must inspect the existing
     * row.
     */
    async insertProcessingClaim(input) {
      const inserted = await db
        .insert(stripeWebhookEventTable)
        .values({
          attempt_count: 1,
          id: input.eventId,
          status: "processing",
          stripe_session_id: input.stripeSessionId,
          type: input.eventType,
          updated_at: input.claimedAt,
        })
        .onConflictDoNothing()
        .returning({ id: stripeWebhookEventTable.id });

      return inserted.length > 0;
    },
    /**
     * Writes the terminal audit state after claimed fulfillment returns.
     */
    async markClaim(input) {
      await db
        .update(stripeWebhookEventTable)
        .set({
          last_error: input.lastError,
          processed_at: input.processedAt,
          status: input.status,
          status_reason: input.statusReason,
          updated_at: input.updatedAt,
        })
        .where(eq(stripeWebhookEventTable.id, input.eventId));
    },
    /**
     * Reclaims a failed or stale `processing` row for a retry.
     *
     * The conditional update is the retry lock. Returning `false` means another
     * worker changed the row before this attempt could reclaim it.
     */
    async reclaimProcessingClaim(input) {
      const reclaimed = await db
        .update(stripeWebhookEventTable)
        .set({
          attempt_count: sql`${stripeWebhookEventTable.attempt_count} + 1`,
          last_error: null,
          status: "processing",
          status_reason: null,
          updated_at: input.claimedAt,
        })
        .where(getReclaimWhereClause(input))
        .returning({ id: stripeWebhookEventTable.id });

      return reclaimed.length > 0;
    },
  };
}
