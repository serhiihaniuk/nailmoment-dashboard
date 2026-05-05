import { handleCheckoutSessionCompleted } from "@/app/stripe/handlers/checkout-session-completed";
import { createStripeWebhookRoute } from "@/app/stripe/route-handler";
import { verifyStripeWebhookRequest } from "@/app/stripe/verify-webhook";

export const POST = createStripeWebhookRoute({
  handlers: {
    "checkout.session.completed": handleCheckoutSessionCompleted,
  },
  verifyRequest: verifyStripeWebhookRequest,
});
