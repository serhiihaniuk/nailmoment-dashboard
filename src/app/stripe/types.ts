import type Stripe from "stripe";

export type StripeLogLevel = "info" | "warn" | "error";

export interface StripeLogContext {
  stripeEventId?: string | undefined;
  stripeSessionId?: string | undefined;
  [key: string]: unknown;
}

export type StripeWebhookHandlerResultKind =
  | "processed"
  | "ignored"
  | "invalid";

export interface StripeWebhookHandlerResult {
  kind: StripeWebhookHandlerResultKind;
  reason: string;
  stripeEventId?: string | undefined;
  stripeSessionId?: string | undefined;
  context?: Record<string, unknown> | undefined;
}

export type StripeWebhookHandler = (
  event: Stripe.Event
) => Promise<StripeWebhookHandlerResult>;

export type StripeWebhookHandlers = Partial<
  Record<Stripe.Event.Type, StripeWebhookHandler>
>;

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
