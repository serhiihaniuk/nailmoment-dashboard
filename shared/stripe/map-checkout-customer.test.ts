import type Stripe from "stripe";
import { expect, test } from "vitest";
import { mapCheckoutCustomer } from "./map-checkout-customer";

test("mapCheckoutCustomer extracts custom fields and customer details", () => {
  const session = {
    custom_fields: [
      {
        key: "full_name",
        text: { value: "Anna Example" },
      },
      {
        key: "instagram",
        text: { value: "@anna_example" },
      },
    ],
    customer_details: {
      email: "anna@example.com",
      name: "Fallback Name",
      phone: "+48123123123",
    },
    metadata: {},
  } as Stripe.Checkout.Session;

  expect(mapCheckoutCustomer(session)).toEqual({
    email: "anna@example.com",
    instagram: "anna_example",
    name: "Anna Example",
    phone: "+48123123123",
  });
});

test("mapCheckoutCustomer falls back to metadata and customer defaults", () => {
  const session = {
    customer_details: {
      email: null,
      name: "Customer Name",
      phone: null,
    },
    customer_email: "fallback@example.com",
    metadata: {
      instagram: "profile_name",
    },
  } as unknown as Stripe.Checkout.Session;

  expect(mapCheckoutCustomer(session)).toEqual({
    email: "fallback@example.com",
    instagram: "profile_name",
    name: "Customer Name",
    phone: "",
  });
});
