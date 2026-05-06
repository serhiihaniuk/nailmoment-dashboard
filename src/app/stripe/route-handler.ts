import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { flushStripeLogs, logStripe, logStripeStep } from "./log";
import type {
  StripeWebhookHandler,
  StripeWebhookHandlers,
  StripeWebhookVerificationResult,
} from "./types";

type VerifyStripeWebhookRequest = (
  request: Request,
) => Promise<StripeWebhookVerificationResult>;

/**
 * Looks up the business handler for the verified Stripe event type.
 *
 * The route receives every Stripe event configured in the Stripe dashboard, but
 * this app only fulfills event types that are explicitly registered by
 * `src/app/api-routes/webhooks/stripe/route.ts`.
 */
function getHandler(
  handlers: StripeWebhookHandlers,
  eventType: Stripe.Event.Type,
): StripeWebhookHandler | undefined {
  return handlers[eventType];
}

/**
 * Builds the `POST` function used by `/api/webhooks/stripe`.
 *
 * This module owns the generic HTTP part of the webhook, not the business
 * meaning of a checkout. The sequence is:
 *
 * 1. Log that a request reached the endpoint.
 * 2. Ask the verifier to authenticate the raw Stripe payload.
 * 3. Find the handler for the verified event type.
 * 4. Run that handler and log its normalized result.
 * 5. Return `{ received: true }` with 200 for handled or intentionally ignored
 *    Stripe events.
 *
 * Stripe treats non-2xx responses as retryable. That is why verification
 * rejects for "real but unwanted" sessions usually return 200, while unexpected
 * server errors return 500 and let Stripe retry.
 */
export function createStripeWebhookRoute({
  flushLogs = flushStripeLogs,
  handlers,
  logger = logStripe,
  verifyRequest,
}: {
  flushLogs?: () => Promise<unknown>;
  handlers: StripeWebhookHandlers;
  logger?: typeof logStripe;
  verifyRequest: VerifyStripeWebhookRequest;
}) {
  return async function POST(request: Request) {
    // This is the earliest log line for the webhook request. It intentionally
    // avoids logging sensitive headers or raw body content.
    logStripeStep("info", "RECEIVED", "Stripe webhook request received", {
      contentType: request.headers.get("content-type"),
      requestMethod: request.method,
      userAgent: request.headers.get("user-agent"),
    });

    try {
      // Verification consumes the raw request body. Nothing should call
      // `request.json()` before this, because Stripe signature validation needs
      // the exact bytes that Stripe signed.
      const verification = await verifyRequest(request);

      if (verification.kind === "rejected") {
        logger(
          verification.logLevel,
          verification.logMessage,
          verification.logContext,
        );
        return Response.json(verification.body, {
          status: verification.status,
        });
      }

      const eventContext = {
        eventType: verification.event.type,
        stripeEventId: verification.event.id,
        stripeSessionId:
          verification.event.type === "checkout.session.completed"
            ? verification.event.data.object.id
            : undefined,
      };

      logStripeStep("info", "VERIFY", "Stripe webhook event verified", {
        ...eventContext,
      });

      const handler = getHandler(handlers, verification.event.type);

      if (!handler) {
        // Unknown event types are acknowledged so Stripe does not retry forever.
        // They are logged for visibility in case the Stripe dashboard starts
        // sending an event this app has not implemented yet.
        logger("warn", "ROUTE No handler registered for Stripe event", {
          ...eventContext,
        });
        return Response.json({ received: true }, { status: 200 });
      }

      logStripeStep("info", "ROUTE", "Dispatching Stripe webhook handler", {
        ...eventContext,
      });

      const result = await handler(verification.event);
      const level = result.kind === "processed" ? "info" : "warn";

      // Handlers return a small normalized result instead of raw side-effect
      // details. That keeps the route-level log consistent across future event
      // handlers while deeper logs stay inside the business handler.
      logger(level, `DONE Stripe event ${result.kind}`, {
        stripeEventId: result.stripeEventId,
        stripeSessionId: result.stripeSessionId,
        reason: result.reason,
        ...result.context,
      });

      return Response.json({ received: true }, { status: 200 });
    } catch (error) {
      // Throwing from a business handler means the event may not be fulfilled.
      // Returning 500 is deliberate: Stripe should retry so the claim/reclaim
      // logic can try the event again.
      logger("error", "FAIL Stripe webhook processing failed", { error });
      return Response.json({ error: "Internal error" }, { status: 500 });
    } finally {
      // Vercel can finish the response before async log flushing completes.
      // `waitUntil` gives Logtail a chance to receive the final route/handler
      // logs without delaying Stripe's HTTP response.
      waitUntil(flushLogs());
    }
  };
}
