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

function getHandler(
  handlers: StripeWebhookHandlers,
  eventType: Stripe.Event.Type,
): StripeWebhookHandler | undefined {
  return handlers[eventType];
}

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
    logStripeStep("info", "RECEIVED", "Stripe webhook request received", {
      contentType: request.headers.get("content-type"),
      requestMethod: request.method,
      userAgent: request.headers.get("user-agent"),
    });

    try {
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

      logger(level, `DONE Stripe event ${result.kind}`, {
        stripeEventId: result.stripeEventId,
        stripeSessionId: result.stripeSessionId,
        reason: result.reason,
        ...result.context,
      });

      return Response.json({ received: true }, { status: 200 });
    } catch (error) {
      logger("error", "FAIL Stripe webhook processing failed", { error });
      return Response.json({ error: "Internal error" }, { status: 500 });
    } finally {
      waitUntil(flushLogs());
    }
  };
}
