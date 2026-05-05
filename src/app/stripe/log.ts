import { logtail } from "@/shared/logtail";
import type { StripeLogContext, StripeLogLevel } from "./types";

function shortenStripeId(value: unknown) {
  return typeof value === "string" && value.length > 0
    ? value.slice(-4).toUpperCase()
    : null;
}

function getStripeLogPrefix(context: StripeLogContext) {
  const eventTag = shortenStripeId(context.stripeEventId);
  const sessionTag = shortenStripeId(context.stripeSessionId);
  const traceTag = eventTag ?? sessionTag;

  return traceTag ? `${traceTag} ` : "";
}

export function logStripe(
  level: StripeLogLevel,
  message: string,
  context: StripeLogContext = {}
) {
  logtail[level](`${getStripeLogPrefix(context)}${message}`, context);
}

export function logStripeStep(
  level: StripeLogLevel,
  step: string,
  message: string,
  context: StripeLogContext = {}
) {
  return logStripe(level, `${step} ${message}`, context);
}

export function flushStripeLogs() {
  return logtail.flush();
}
