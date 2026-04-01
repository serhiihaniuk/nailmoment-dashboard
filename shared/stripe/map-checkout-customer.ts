import type Stripe from "stripe";
import { extractInstagramUsername } from "@/shared/utils";

export interface StripeCheckoutCustomer {
  email: string;
  instagram: string;
  name: string;
  phone: string;
}

function findCustomFieldValue(
  session: Stripe.Checkout.Session,
  predicate: (key: string) => boolean,
) {
  return (
    session.custom_fields?.find((field) => predicate(field.key))?.text?.value ??
    null
  );
}

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
