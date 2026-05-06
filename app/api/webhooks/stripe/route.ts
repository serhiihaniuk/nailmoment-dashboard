/**
 * Public Next.js route file for Stripe webhooks.
 *
 * The real implementation lives under `src/app/api-routes/...` so route code
 * stays in the app slice while this top-level `app/` file only exposes the URL
 * that Stripe calls:
 *
 *   POST /api/webhooks/stripe
 *
 * Follow the export below to start debugging the webhook flow.
 */
export { POST } from "@/app/api-routes/webhooks/stripe/route";
