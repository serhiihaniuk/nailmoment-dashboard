import type Stripe from "stripe";

/**
 * Shared Stripe webhook contracts.
 *
 * Keep these types small and transport-oriented. Route code uses them to move a
 * verified Stripe event through the generic route handler and into a
 * business-specific handler, without coupling the route to ticket/finance
 * details.
 */

export type StripeLogLevel = "info" | "warn" | "error";

/**
 * Structured context attached to Stripe logs.
 *
 * `stripeEventId` and `stripeSessionId` are the important correlation ids:
 * route logs, verification logs, fulfillment logs, and database audit rows can
 * all be tied back to the same Stripe delivery.
 */
export interface StripeLogContext {
  stripeEventId?: string | undefined;
  stripeSessionId?: string | undefined;
  [key: string]: unknown;
}

/**
 * Normalized handler outcome.
 *
 * The HTTP route only needs to know whether the event was processed, ignored,
 * or invalid. Details such as ticket ids, finance totals, and email attempts
 * stay inside the event handler logs.
 */
export type StripeWebhookHandlerResultKind =
  | "processed"
  | "ignored"
  | "invalid";

/**
 * Event handler return value consumed by the generic route.
 *
 * `reason` is intentionally required so every terminal path produces an
 * operator-readable explanation in logs.
 */
export interface StripeWebhookHandlerResult {
  kind: StripeWebhookHandlerResultKind;
  reason: string;
  stripeEventId?: string | undefined;
  stripeSessionId?: string | undefined;
  context?: Record<string, unknown> | undefined;
}

/**
 * Business handler for a verified Stripe event.
 *
 * The input event has already passed signature verification. The handler still
 * owns event-specific validation, idempotency, and side effects such as ticket,
 * finance, payment, QR, and email work.
 */
export type StripeWebhookHandler = (
  event: Stripe.Event
) => Promise<StripeWebhookHandlerResult>;

/**
 * Registry of supported Stripe event types.
 *
 * Unsupported event types are acknowledged by the route but not fulfilled.
 * Registering a handler here is the switch that makes a Stripe event able to
 * create local business records.
 */
export type StripeWebhookHandlers = Partial<
  Record<Stripe.Event.Type, StripeWebhookHandler>
>;

/**
 * Result of authenticating a raw Stripe webhook request.
 *
 * `verified` means the route can safely dispatch the event. `rejected` means
 * the verifier already knows the correct HTTP status/body/log message. Some
 * rejections return 200 because the request is authentic but intentionally not
 * fulfillable by this app.
 */
export type StripeWebhookVerificationResult =
  | {
      kind: "verified";
      event: Stripe.Event;
    }
  | {
      kind: "rejected";
      status: number;
      body: Record<string, unknown>;
      logLevel: StripeLogLevel;
      logMessage: string;
      logContext?: StripeLogContext | undefined;
    };
