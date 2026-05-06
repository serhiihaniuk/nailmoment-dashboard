import { logtail } from "@/shared/logtail";
import type { StripeLogContext, StripeLogLevel } from "./types";

/**
 * Stripe webhook logging helpers.
 *
 * The webhook flow crosses several files and several side effects. These
 * helpers keep every log line shaped the same way so one Stripe event can be
 * followed from HTTP receipt through verification, claim, ticket creation,
 * finance totals, payment insertion, QR generation, and email delivery.
 */

/**
 * Creates a short human-friendly tag from a Stripe id.
 *
 * Full Stripe ids remain in structured context; the message prefix uses only
 * the last characters so Logtail lists are easier to scan without losing the
 * exact id in metadata.
 */
function shortenStripeId(value: unknown) {
  return typeof value === "string" && value.length > 0
    ? value.slice(-4).toUpperCase()
    : null;
}

/** Chooses the event id as the preferred trace tag, then falls back to session id. */
function getStripeLogPrefix(context: StripeLogContext) {
  const eventTag = shortenStripeId(context.stripeEventId);
  const sessionTag = shortenStripeId(context.stripeSessionId);
  const traceTag = eventTag ?? sessionTag;

  return traceTag ? `${traceTag} ` : "";
}

/**
 * Writes a Stripe log entry with a correlation prefix.
 *
 * Do not pass raw request bodies, full headers, secrets, or card/customer data
 * here. The webhook files log operational ids and high-level state only.
 */
export function logStripe(
  level: StripeLogLevel,
  message: string,
  context: StripeLogContext = {}
) {
  logtail[level](`${getStripeLogPrefix(context)}${message}`, context);
}

/**
 * Convenience wrapper that makes the flow stage explicit in the message.
 *
 * Common steps are `RECEIVED`, `VERIFY`, `ROUTE`, `CLAIM`, `PROCESS`, `DB`,
 * `FINANCE`, `QR`, `EMAIL`, and `DONE`.
 */
export function logStripeStep(
  level: StripeLogLevel,
  step: string,
  message: string,
  context: StripeLogContext = {}
) {
  return logStripe(level, `${step} ${message}`, context);
}

/**
 * Flushes buffered Logtail events.
 *
 * The route calls this with Vercel `waitUntil` after responding to Stripe, so
 * logging does not slow down Stripe's webhook response path.
 */
export function flushStripeLogs() {
  return logtail.flush();
}
