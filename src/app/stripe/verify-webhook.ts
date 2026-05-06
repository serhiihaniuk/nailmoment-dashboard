import Stripe from "stripe";
import { readStripeWebhookEnv } from "@/shared/config/env";
import { logStripeStep } from "./log";
import type { StripeWebhookVerificationResult } from "./types";

/**
 * Verification layer for Stripe webhook requests.
 *
 * This file runs before any ticket, finance, payment, QR, or email side effect.
 * Its job is to answer only one question: "Can this raw HTTP request be trusted
 * enough for a business handler to inspect it?"
 *
 * It verifies trust in layers:
 *
 * 1. Required Stripe env vars exist.
 * 2. The `stripe-signature` header is present.
 * 3. Stripe's SDK can reconstruct the event from the exact raw request body.
 * 4. For `checkout.session.completed`, optional app guards validate that the
 *    session is the expected mode, livemode, currency, and price set.
 *
 * No dashboard totals are written here. The total connection happens later in
 * `checkout-session-completed.ts`, where Stripe `amount_total` becomes finance
 * `gross_total` and the paid installment amount.
 */

const STRIPE_API_VERSION = "2026-03-25.dahlia";

/**
 * Runtime config for the webhook verifier.
 *
 * `secretKey` lets the app call Stripe when extra validation is needed.
 * `webhookSecret` verifies that Stripe signed this exact request.
 * The allow-lists are optional safety rails used to reject sessions from a
 * wrong currency, wrong livemode, or wrong Stripe Price.
 */
export interface StripeWebhookConfig {
  allowedCurrencies: string[];
  allowedPriceIds: string[];
  expectedLivemode: boolean;
  secretKey: string;
  webhookSecret: string;
}

type StripeWebhookRejection = Extract<
  StripeWebhookVerificationResult,
  { kind: "rejected" }
>;

type StripeCheckoutValidationResult =
  | { ok: true }
  | { ok: false; rejection: StripeWebhookRejection };

/** Keeps optional env parsing concise while preserving strict string checks. */
function isPresent(value: string | false | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Parses comma-separated env allow-lists.
 *
 * Empty or missing values mean "no allow-list for this dimension", not "reject
 * everything". That keeps the webhook usable in environments where a guard has
 * not been configured yet.
 */
function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0);
}

/**
 * Infers whether this webhook should expect live-mode Stripe events.
 *
 * If `STRIPE_WEBHOOK_EXPECT_LIVEMODE` is not set, the app derives the expected
 * mode from the secret key. This catches a common dangerous mismatch: a live
 * webhook hitting a preview/dev key, or a test webhook hitting production code.
 */
function inferLivemode(secretKey: string) {
  return (
    secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")
  );
}

/**
 * Shared context for checkout-session verification logs.
 *
 * These values are safe to log and explain why a session was accepted or
 * rejected before fulfillment. The full raw payload is intentionally not logged.
 */
function getCheckoutSessionLogContext(session: Stripe.Checkout.Session) {
  return {
    checkoutMode: session.mode,
    currency: session.currency,
    metadata: session.metadata ?? {},
    paymentStatus: session.payment_status,
    stripeSessionId: session.id,
  };
}

/**
 * Reads only the Stripe webhook-related environment variables.
 *
 * This keeps env validation scoped: importing Stripe webhook code should not
 * require unrelated secrets such as Resend, Telegram, or database URLs. Missing
 * required Stripe keys are returned as data so the route can log and respond
 * with a controlled error instead of crashing during module import.
 */
export function readStripeWebhookConfig(
  env: NodeJS.ProcessEnv = process.env
):
  | { ok: true; config: StripeWebhookConfig }
  | { ok: false; missingKeys: string[] } {
  const stripeEnv = readStripeWebhookEnv(env);
  const secretKey = stripeEnv.secretKey;
  const webhookSecret = stripeEnv.webhookSecret;

  if (!secretKey || !webhookSecret) {
    return {
      ok: false,
      missingKeys: [
        !secretKey && "STRIPE_SECRET_KEY",
        !webhookSecret && "STRIPE_WEBHOOK_SECRET",
      ].filter(isPresent),
    };
  }

  return {
    ok: true,
    config: {
      allowedCurrencies: parseCsv(stripeEnv.allowedCurrencies).map(
        (currency) => currency.toLowerCase()
      ),
      allowedPriceIds: parseCsv(stripeEnv.allowedPriceIds),
      expectedLivemode:
        stripeEnv.expectLivemode === undefined
          ? inferLivemode(secretKey)
          : stripeEnv.expectLivemode === "true",
      secretKey,
      webhookSecret,
    },
  };
}

/**
 * Performs app-level validation after Stripe signature verification.
 *
 * Signature verification proves the event came from Stripe. It does not prove
 * this checkout is one this app should fulfill. These checks reject sessions
 * that are valid Stripe objects but unsafe for local side effects:
 *
 * - only one-time `payment` Checkout Sessions are fulfilled;
 * - live/test mode must match this deployment;
 * - configured currency allow-list must match;
 * - configured Stripe Price allow-list must match.
 *
 * Rejected checkout sessions return 200 because the app intentionally decided
 * not to process them. Returning 500 would tell Stripe to retry an event that
 * will never become valid.
 */
export async function validateCheckoutSessionCompletedEvent(
  session: Stripe.Checkout.Session,
  config: Pick<
    StripeWebhookConfig,
    "allowedCurrencies" | "allowedPriceIds" | "expectedLivemode"
  >,
  stripe: Pick<Stripe, "checkout">
): Promise<StripeCheckoutValidationResult> {
  if (session.mode !== "payment") {
    return {
      ok: false,
      rejection: {
        kind: "rejected",
        status: 200,
        body: { received: true },
        logContext: {
          ...getCheckoutSessionLogContext(session),
          expectedCheckoutMode: "payment",
          receivedCheckoutMode: session.mode,
        },
        logLevel: "error",
        logMessage: "VERIFY Ignoring Stripe session with unexpected checkout mode",
      },
    };
  }

  if (session.livemode !== config.expectedLivemode) {
    return {
      ok: false,
      rejection: {
        kind: "rejected",
        status: 200,
        body: { received: true },
        logContext: {
          ...getCheckoutSessionLogContext(session),
          expectedLivemode: config.expectedLivemode,
          receivedLivemode: session.livemode,
        },
        logLevel: "error",
        logMessage: "VERIFY Ignoring Stripe session with unexpected livemode",
      },
    };
  }

  if (
    config.allowedCurrencies.length > 0 &&
    (!session.currency ||
      !config.allowedCurrencies.includes(session.currency.toLowerCase()))
  ) {
    return {
      ok: false,
      rejection: {
        kind: "rejected",
        status: 200,
        body: { received: true },
        logContext: {
          allowedCurrencies: config.allowedCurrencies,
          ...getCheckoutSessionLogContext(session),
          receivedCurrency: session.currency,
        },
        logLevel: "error",
        logMessage: "VERIFY Ignoring Stripe session with unexpected currency",
      },
    };
  }

  if (config.allowedPriceIds.length > 0) {
    // Price ids are not included directly on every Checkout Session event, so
    // the verifier fetches line items from Stripe only when a price allow-list
    // has been configured.
    logStripeStep("info", "VERIFY", "Fetching Stripe line items for allow-list validation", {
      allowedPriceIds: config.allowedPriceIds,
      stripeSessionId: session.id,
    });

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
    });
    const priceIds = lineItems.data
      .map((item) => item.price?.id)
      .filter((priceId): priceId is string => Boolean(priceId));
    const hasUnexpectedPrice = priceIds.some(
      (priceId) => !config.allowedPriceIds.includes(priceId)
    );

    if (priceIds.length === 0 || hasUnexpectedPrice) {
      return {
        ok: false,
        rejection: {
        kind: "rejected",
        status: 200,
        body: { received: true },
        logContext: {
          allowedPriceIds: config.allowedPriceIds,
          ...getCheckoutSessionLogContext(session),
          priceIds,
        },
        logLevel: "error",
        logMessage: "VERIFY Ignoring Stripe session with unexpected price ids",
      },
    };
  }
  }

  return { ok: true };
}

/**
 * Creates the Stripe SDK client used by webhook verification.
 *
 * Keep the API version pinned so Stripe payload shapes do not silently change
 * when the account default API version changes.
 */
export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

/**
 * Factory for the request verifier.
 *
 * Tests inject a fake env/client through this factory. Production uses the
 * exported `verifyStripeWebhookRequest` below, which reads process env and
 * creates a real Stripe client.
 */
export function createStripeWebhookVerifier(
  dependencies: {
    createClient?: typeof createStripeClient;
    env?: NodeJS.ProcessEnv;
  } = {}
) {
  const createClient = dependencies.createClient ?? createStripeClient;
  const env = dependencies.env ?? process.env;

  return async function verifyStripeWebhookRequest(
    request: Request
  ): Promise<StripeWebhookVerificationResult> {
    // Load config inside the request handler so missing env vars produce a
    // logged HTTP response instead of crashing the Next.js module at import time.
    const configResult = readStripeWebhookConfig(env);

    logStripeStep("info", "VERIFY", "Loaded Stripe webhook config", {
      allowedCurrencies:
        configResult.ok ? configResult.config.allowedCurrencies : undefined,
      allowedPriceIds:
        configResult.ok ? configResult.config.allowedPriceIds : undefined,
      expectedLivemode:
        configResult.ok ? configResult.config.expectedLivemode : undefined,
    });

    if (!configResult.ok) {
      return {
        kind: "rejected",
        status: 500,
        body: { error: "Server mis-configuration" },
        logContext: {
          missingKeys: configResult.missingKeys,
        },
        logLevel: "error",
        logMessage: "Stripe env vars missing",
      };
    }

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      // Missing signature means there is no trustworthy way to parse the body as
      // a Stripe event. Return 400 because this is a malformed webhook request.
      return {
        kind: "rejected",
        status: 400,
        body: { error: "Missing signature" },
        logContext: {
          contentType: request.headers.get("content-type"),
          userAgent: request.headers.get("user-agent"),
        },
        logLevel: "error",
        logMessage: "Webhook without signature",
      };
    }

    const body = await request.text();
    const stripe = createClient(configResult.config.secretKey);

    let event: Stripe.Event;

    try {
      // Stripe signs the exact raw body string. This is why callers must not
      // parse JSON before verification.
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        configResult.config.webhookSecret
      );
    } catch (error) {
      // Bad signatures are rejected before any event-specific logic runs. This
      // protects ticket creation and finance totals from forged HTTP requests.
      return {
        kind: "rejected",
        status: 400,
        body: { error: "Bad signature" },
        logContext: { error },
        logLevel: "error",
        logMessage: "Signature verification failed",
      };
    }

    const stripeSessionId =
      event.type === "checkout.session.completed"
        ? event.data.object.id
        : undefined;

    logStripeStep("info", "VERIFY", "Stripe signature accepted", {
      eventType: event.type,
      stripeEventId: event.id,
      stripeSessionId,
    });

    if (event.type === "checkout.session.completed") {
      // From this point the payload is authentic, but still not necessarily one
      // this app should fulfill. The app-level session checks run before the
      // event reaches ticket/payment creation.
      logStripeStep("info", "VERIFY", "Validating checkout session payload", {
        eventType: event.type,
        stripeEventId: event.id,
        ...getCheckoutSessionLogContext(event.data.object),
      });

      const sessionValidation = await validateCheckoutSessionCompletedEvent(
        event.data.object,
        configResult.config,
        stripe
      );

      if (!sessionValidation.ok) {
        return sessionValidation.rejection;
      }
    }

    return {
      kind: "verified",
      event,
    };
  };
}

export const verifyStripeWebhookRequest = createStripeWebhookVerifier();
