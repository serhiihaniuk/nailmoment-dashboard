import { logtail } from "@/shared/logtail";
import type { StripeLogContext, StripeLogLevel } from "./types";

export function logStripe(
  level: StripeLogLevel,
  message: string,
  context: StripeLogContext = {}
) {
  const prefix =
    typeof context.stripeSessionId === "string"
      ? `${context.stripeSessionId.slice(-4)} `
      : "";

  logtail[level](`${prefix}${message}`, context);
}

export function flushStripeLogs() {
  return logtail.flush();
}
