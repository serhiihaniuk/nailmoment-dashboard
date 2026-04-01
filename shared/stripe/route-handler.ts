import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { flushStripeLogs, logStripe } from "./log";
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
    try {
      const verification = await verifyRequest(request);      if (verification.kind === "rejected") {
        logger(
          verification.logLevel,
          verification.logMessage,
          verification.logContext,
        );
        return Response.json(verification.body, {
          status: verification.status,
        });
      }

      const handler = getHandler(handlers, verification.event.type);

      if (!handler) {
        logger("warn", "Unhandled Stripe event", {
          stripeEventId: verification.event.id,
          eventType: verification.event.type,
        });
        return Response.json({ received: true }, { status: 200 });
      }

      const result = await handler(verification.event);
      const level = result.kind === "processed" ? "info" : "warn";

      logger(level, `Stripe event ${result.kind}`, {
        stripeEventId: result.stripeEventId,
        stripeSessionId: result.stripeSessionId,
        reason: result.reason,
        ...result.context,
      });

      return Response.json({ received: true }, { status: 200 });
    } catch (error) {
      logger("error", "Stripe webhook processing failed", { error });
      return Response.json({ error: "Internal error" }, { status: 500 });
    } finally {
      waitUntil(flushLogs());
    }
  };
}
