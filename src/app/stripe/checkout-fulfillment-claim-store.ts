import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { stripeWebhookEventTable } from "@/shared/db/schema";
import type {
  ReclaimStripeCheckoutFulfillmentClaimInput,
  StripeCheckoutFulfillmentClaimStore,
} from "./checkout-fulfillment-claim";

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

export function createStripeCheckoutFulfillmentClaimStore(): StripeCheckoutFulfillmentClaimStore {
  return {
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
