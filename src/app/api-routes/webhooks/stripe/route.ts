import { handleCheckoutSessionCompleted } from "@/app/stripe/handlers/checkout-session-completed";
import { createStripeWebhookRoute } from "@/app/stripe/route-handler";
import { verifyStripeWebhookRequest } from "@/app/stripe/verify-webhook";

/**
 * Stripe webhook route composition.
 *
 * This is the first application-owned file after Next.js routes
 * `POST /api/webhooks/stripe` here. Keep the flow in this order when reading:
 *
 * 1. `verifyStripeWebhookRequest` proves the request came from Stripe and
 *    rejects sessions that do not match the configured environment/currency/
 *    price guards.
 * 2. `createStripeWebhookRoute` handles shared HTTP concerns: logging,
 *    dispatching to a registered event handler, returning Stripe-friendly
 *    responses, and flushing logs after the response.
 * 3. `handleCheckoutSessionCompleted` owns the business fulfillment for paid
 *    Checkout Sessions: ticket creation, finance totals, payment installment,
 *    QR generation, and customer email.
 *
 * Add new Stripe event types by registering another handler in the `handlers`
 * map. Do not put event-specific business logic directly in this route file.
 */
export const POST = createStripeWebhookRoute({
  handlers: {
    "checkout.session.completed": handleCheckoutSessionCompleted,
  },
  verifyRequest: verifyStripeWebhookRequest,
});
