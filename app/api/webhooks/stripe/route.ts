import { handleCheckoutSessionCompleted } from "@/shared/stripe/handlers/checkout-session-completed";
import { createStripeWebhookRoute } from "@/shared/stripe/route-handler";
import { verifyStripeWebhookRequest } from "@/shared/stripe/verify-webhook";

export const POST = createStripeWebhookRoute({
  handlers: {
    "checkout.session.completed": handleCheckoutSessionCompleted,
  },
  verifyRequest: verifyStripeWebhookRequest,
});
