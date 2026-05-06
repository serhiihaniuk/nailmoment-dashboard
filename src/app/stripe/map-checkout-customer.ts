import type Stripe from "stripe";
import { extractInstagramUsername } from "@/entities/ticket";

/**
 * Customer fields the dashboard stores after a Stripe Checkout purchase.
 *
 * Stripe has several places where customer data can appear: standard customer
 * details, custom fields configured on Checkout, and metadata. The mapper below
 * normalizes those sources into the ticket/battle-ticket shape used by local DB
 * writes.
 */
export interface StripeCheckoutCustomer {
  email: string;
  instagram: string;
  name: string;
  phone: string;
}

/**
 * Reads one text custom field by key.
 *
 * Checkout custom field keys can drift slightly when edited in Stripe, so
 * callers provide a predicate instead of relying on one exact object path in the
 * fulfillment code.
 */
function findCustomFieldValue(
  session: Stripe.Checkout.Session,
  predicate: (key: string) => boolean,
) {
  return (
    session.custom_fields?.find((field) => predicate(field.key))?.text?.value ??
    null
  );
}

/**
 * Maps Stripe Checkout customer/session data into the local ticket customer.
 *
 * This function does not decide whether the checkout is valid, paid, or how much
 * money was collected. It only extracts customer-facing fields after the
 * verifier and business handler have accepted the session. Finance totals stay
 * connected to Stripe through `session.amount_total` in the checkout handler.
 */
export function mapCheckoutCustomer(
  session: Stripe.Checkout.Session,
): StripeCheckoutCustomer {
  const customName = findCustomFieldValue(
    session,
    (key) => key === "name" || key.toLowerCase().includes("name"),
  );
  const instagramInput =
    findCustomFieldValue(session, (key) => key.toLowerCase() === "instagram") ??
    session.metadata?.instagram ??
    "";

  return {
    email: session.customer_details?.email ?? session.customer_email ?? "",
    instagram: instagramInput ? extractInstagramUsername(instagramInput) : "",
    name: customName ?? session.customer_details?.name ?? "not found",
    phone: session.customer_details?.phone ?? "",
  };
}
