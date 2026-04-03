import Stripe from "stripe";
import type { StripeWebhookVerificationResult } from "./types";

const STRIPE_API_VERSION = "2026-03-25.dahlia";

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

function isPresent(value: string | false | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0);
}

function inferLivemode(secretKey: string) {
  return (
    secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")
  );
}

export function readStripeWebhookConfig(
  env: NodeJS.ProcessEnv = process.env
):
  | { ok: true; config: StripeWebhookConfig }
  | { ok: false; missingKeys: string[] } {
  const secretKey = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

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
      allowedCurrencies: parseCsv(env.STRIPE_WEBHOOK_ALLOWED_CURRENCIES).map(
        (currency) => currency.toLowerCase()
      ),
      allowedPriceIds: parseCsv(env.STRIPE_WEBHOOK_ALLOWED_PRICE_IDS),
      expectedLivemode:
        env.STRIPE_WEBHOOK_EXPECT_LIVEMODE === undefined
          ? inferLivemode(secretKey)
          : env.STRIPE_WEBHOOK_EXPECT_LIVEMODE === "true",
      secretKey,
      webhookSecret,
    },
  };
}

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
          mode: session.mode,
          stripeSessionId: session.id,
        },
        logLevel: "error",
        logMessage: "Ignoring Stripe session with unexpected checkout mode",
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
          expectedLivemode: config.expectedLivemode,
          receivedLivemode: session.livemode,
          stripeSessionId: session.id,
        },
        logLevel: "error",
        logMessage: "Ignoring Stripe session with unexpected livemode",
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
          currency: session.currency,
          stripeSessionId: session.id,
        },
        logLevel: "error",
        logMessage: "Ignoring Stripe session with unexpected currency",
      },
    };
  }

  if (config.allowedPriceIds.length > 0) {
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
            priceIds,
            stripeSessionId: session.id,
          },
          logLevel: "error",
          logMessage: "Ignoring Stripe session with unexpected price ids",
        },
      };
    }
  }

  return { ok: true };
}

export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

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
    const configResult = readStripeWebhookConfig(env);

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
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        configResult.config.webhookSecret
      );
    } catch (error) {
      return {
        kind: "rejected",
        status: 400,
        body: { error: "Bad signature" },
        logContext: { error },
        logLevel: "error",
        logMessage: "Signature verification failed",
      };
    }

    if (event.type === "checkout.session.completed") {
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
