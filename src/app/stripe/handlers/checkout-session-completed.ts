import type Stripe from "stripe";
import { TICKET_TYPE_LIST, type TicketGrade } from "@/entities/ticket";
import { db } from "@/shared/db";
import { createTicketAttributionService } from "@/shared/db/service/ticket-attribution-service";
import { runStripeCheckoutFulfillmentClaimLifecycle } from "../checkout-fulfillment-claim";
import { createStripeCheckoutFulfillmentClaimStore } from "../checkout-fulfillment-claim-store";
import { logStripe, logStripeStep } from "../log";
import { fulfillStripeBattleTicketCheckoutSession } from "../stripe-battle-ticket-fulfillment";
import { fulfillStripeTicketCheckoutSession } from "../stripe-ticket-fulfillment";
import type { StripeWebhookHandlerResult } from "../types";

/**
 * Handles Stripe's `checkout.session.completed` webhook.
 *
 * This file is the bridge between a successful Stripe checkout and the
 * operational records the dashboard needs:
 *
 * 1. Store a webhook-processing row so the same Stripe event cannot create
 *    duplicate tickets when Stripe retries the webhook.
 * 2. Validate that the checkout belongs to Nail Moment and that Stripe says it
 *    is paid.
 * 3. Decide whether this checkout creates a regular festival ticket or a
 *    battle ticket, based on Stripe metadata.
 * 4. Delegate product-specific work to focused fulfillment adapters.
 * 5. Mark the webhook claim with the normalized outcome.
 *
 * Important: Ticket Delivery is intentionally best-effort after durable
 * dashboard records exist. If email handoff fails, the created Ticket, Ticket
 * Finance, Payment, and QR records remain intact and Stripe should not retry
 * the purchase fulfillment just because the email provider failed.
 */

/**
 * Result of interpreting the Stripe Checkout Session.
 *
 * Stripe sends the same event type for all completed Checkout Sessions, so the
 * app must inspect metadata before doing any business action. This type makes
 * the decision explicit:
 *
 * - `ticket`: a normal Nail Moment ticket checkout.
 * - `battle`: a battle registration checkout.
 * - `ignored`: a valid Stripe event that this handler should not fulfill.
 * - `invalid`: a Nail Moment-looking event with metadata we cannot safely use.
 */
type CheckoutResolution =
  | { kind: "battle" }
  | { kind: "ticket"; ticketGrade: TicketGrade }
  | {
      kind: "ignored" | "invalid";
      reason: string;
      context?: Record<string, unknown>;
    };

/**
 * Builds the shared logging context used throughout the handler. Keeping these
 * ids on every log line makes it possible to reconstruct one webhook's path
 * through claim, resolve, DB writes, QR generation, and email sending.
 */
function getEventContext(
  event: Pick<Stripe.Event, "id" | "type">,
  stripeSessionId?: string,
) {
  return {
    stripeEventId: event.id,
    stripeSessionId,
    stripeEventType: event.type,
  };
}

function isCheckoutSessionCompletedEvent(
  event: Stripe.Event,
): event is Stripe.CheckoutSessionCompletedEvent {
  return event.type === "checkout.session.completed";
}

/**
 * Narrows untrusted Stripe metadata into the dashboard's known ticket grades.
 * Metadata is controlled by our checkout creation code, but webhook handlers
 * still treat it as runtime input because Stripe delivers it over the network.
 */
function isTicketGrade(value: string): value is TicketGrade {
  return TICKET_TYPE_LIST.some((grade) => grade === value);
}

/**
 * Turns a paid Stripe Checkout Session into a local business action.
 *
 * This is deliberately strict. The handler ignores unpaid sessions and sessions
 * that do not have `metadata.event = "nailmoment"`. For Nail Moment sessions,
 * it either recognizes a battle checkout or requires a valid `ticket_grade`.
 * Invalid metadata is treated as an operator-visible problem instead of trying
 * to guess what the customer bought.
 */
export function resolveCheckoutSession(
  session: Stripe.Checkout.Session,
): CheckoutResolution {
  if (session.payment_status !== "paid") {
    return {
      context: {
        expectedPaymentStatus: "paid",
        metadata: session.metadata ?? {},
        receivedPaymentStatus: session.payment_status,
      },
      kind: "ignored",
      reason: "unpaid_session",
    };
  }

  if (session.metadata?.event !== "nailmoment") {
    return {
      context: {
        expectedEventMetadata: "nailmoment",
        metadata: session.metadata ?? {},
        receivedEventMetadata: session.metadata?.event ?? null,
      },
      kind: "ignored",
      reason: "unexpected_event_metadata",
    };
  }

  if (session.metadata?.type === "battle") {
    return { kind: "battle" };
  }

  const ticketGrade = (session.metadata?.ticket_grade ?? "").toLowerCase();

  if (!isTicketGrade(ticketGrade)) {
    return {
      context: {
        allowedTicketGrades: TICKET_TYPE_LIST,
        metadata: session.metadata ?? {},
        receivedTicketGrade: session.metadata?.ticket_grade ?? null,
      },
      kind: "invalid",
      reason: "invalid_ticket_grade",
    };
  }

  return {
    kind: "ticket",
    ticketGrade,
  };
}

const stripeCheckoutFulfillmentClaimStore =
  createStripeCheckoutFulfillmentClaimStore();
const ticketAttributionService = createTicketAttributionService(db);

function getAttributionClientReferenceId(session: Stripe.Checkout.Session) {
  const clientReferenceId = session.client_reference_id?.trim();

  if (!clientReferenceId?.startsWith("attr_")) {
    return null;
  }

  return clientReferenceId;
}

/**
 * Main entry point used by the Stripe webhook route.
 *
 * Flow:
 *
 * 1. Confirm this is really `checkout.session.completed`.
 * 2. Run the extracted claim lifecycle so retries/concurrent functions do not
 *    duplicate fulfillment.
 * 3. Resolve the session into battle ticket, regular ticket, ignored, or
 *    invalid.
 * 4. Fulfill the recognized checkout type.
 * 5. Mark ignored/processed/failed status on the webhook audit row.
 *
 * Any thrown error marks the webhook row as `failed` and is rethrown so Stripe
 * can retry. Non-critical email errors are caught inside the fulfillment
 * functions, so they do not make Stripe retry a successfully created ticket.
 */
export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
): Promise<StripeWebhookHandlerResult> {
  if (!isCheckoutSessionCompletedEvent(event)) {
    return {
      context: {
        expectedEventType: "checkout.session.completed",
        receivedEventType: event.type,
      },
      kind: "invalid",
      reason: "unexpected_event_type",
      stripeEventId: event.id,
    };
  }

  const session = event.data.object;
  const stripeSessionId = session.id;
  const eventContext = getEventContext(event, stripeSessionId);

  try {
    // The extracted lifecycle owns idempotency, retry, and terminal claim
    // transitions. The callback below owns only the Stripe Checkout product
    // branch: resolve the session, create the right local record, and report a
    // normalized handler result back to the lifecycle.
    return await runStripeCheckoutFulfillmentClaimLifecycle({
      event,
      fulfillClaim: async () => {
        logStripeStep(
          "info",
          "HANDLE",
          "Processing checkout.session.completed event",
          {
            ...eventContext,
            metadata: session.metadata ?? {},
            paymentStatus: session.payment_status,
          }
        );

        const resolution = resolveCheckoutSession(session);

        if (resolution.kind === "ignored" || resolution.kind === "invalid") {
          logStripeStep(
            "warn",
            "RESOLVE",
            "Checkout session was ignored during resolution",
            {
              ...eventContext,
              ...resolution.context,
              reason: resolution.reason,
            }
          );

          return {
            kind: resolution.kind,
            context: resolution.context,
            reason: resolution.reason,
            stripeEventId: event.id,
            stripeSessionId,
          };
        }

        switch (resolution.kind) {
          case "battle": {
            logStripeStep(
              "info",
              "RESOLVE",
              "Resolved checkout session as battle ticket",
              {
                ...eventContext,
              }
            );
            const fulfillmentResult =
              await fulfillStripeBattleTicketCheckoutSession({
                event,
                session,
              });
            return {
              kind: "processed",
              reason:
                fulfillmentResult.kind === "created"
                  ? "battle_ticket_created"
                  : "battle_ticket_already_exists",
              stripeEventId: event.id,
              stripeSessionId,
            };
          }
          case "ticket": {
            logStripeStep(
              "info",
              "RESOLVE",
              "Resolved checkout session as regular ticket",
              {
                ...eventContext,
                ticketGrade: resolution.ticketGrade,
              }
            );
            const fulfillmentResult =
              await fulfillStripeTicketCheckoutSession({
                event,
                session,
                ticketGrade: resolution.ticketGrade,
              });
            const clientReferenceId = getAttributionClientReferenceId(session);

            if (clientReferenceId) {
              const attribution =
                await ticketAttributionService.attachCheckoutAttributionToTicket(
                  {
                    clientReferenceId,
                    stripeSessionId,
                    ticketId: fulfillmentResult.ticketId,
                  }
                );

              logStripeStep(
                attribution ? "info" : "warn",
                "ATTRIBUTION",
                attribution
                  ? "Attached checkout attribution by client_reference_id"
                  : "Checkout attribution reference was not found",
                {
                  ...eventContext,
                  clientReferenceId,
                  ticketId: fulfillmentResult.ticketId,
                }
              );
            }

            return {
              claimStatusReason:
                fulfillmentResult.kind === "created"
                  ? "ticket_created_with_payment"
                  : "ticket_already_exists",
              kind: "processed",
              reason:
                fulfillmentResult.kind === "created"
                  ? "ticket_created"
                  : "ticket_already_exists",
              stripeEventId: event.id,
              stripeSessionId,
            };
          }
        }
      },
      logger: logStripeStep,
      store: stripeCheckoutFulfillmentClaimStore,
      stripeSessionId,
    });
  } catch (error) {
    logStripe("error", "Checkout session processing failed", {
      ...eventContext,
      error,
    });
    throw error;
  }
}
