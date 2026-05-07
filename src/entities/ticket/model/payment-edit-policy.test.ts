import { describe, expect, test } from "vitest";
import {
  PAYMENT_EDIT_DENIAL_REASONS,
  PAYMENT_EDIT_FIELDS,
  getPaymentDeleteDenialReason,
  getPaymentFieldEditDenialReason,
  getPaymentPatchDenialReason,
  isStripeTicketPayment,
  type PaymentEditPolicyContext,
} from "./payment-edit-policy";

function makeContext(
  overrides: {
    stripeEventId?: string;
    installmentNumber?: number;
    isPaid?: boolean;
  } = {}
): PaymentEditPolicyContext {
  return {
    ticket: {
      stripe_event_id: overrides.stripeEventId ?? "manual_ticket-1",
    },
    payment: {
      installment_number: overrides.installmentNumber ?? 1,
      is_paid: overrides.isPaid ?? false,
    },
  };
}

describe("payment edit policy", () => {
  test("allows only invoice fields for Stripe Ticket Payments", () => {
    const context = makeContext({
      stripeEventId: "cs_test_123",
      installmentNumber: 1,
      isPaid: true,
    });

    expect(isStripeTicketPayment(context)).toBe(true);
    expect(
      getPaymentFieldEditDenialReason(context, "invoice_status")
    ).toBeNull();
    expect(
      getPaymentFieldEditDenialReason(context, "invoice_number")
    ).toBeNull();
    expect(getPaymentFieldEditDenialReason(context, "amount")).toBe(
      PAYMENT_EDIT_DENIAL_REASONS.stripeTicketPaymentField
    );
    expect(
      getPaymentPatchDenialReason(context, ["invoice_status", "amount"])
    ).toBe(PAYMENT_EDIT_DENIAL_REASONS.stripeTicketPaymentField);
  });

  test("locks paid Payment amount, paid date, and sale source", () => {
    const context = makeContext({ isPaid: true, installmentNumber: 2 });

    expect(getPaymentFieldEditDenialReason(context, "amount")).toBe(
      PAYMENT_EDIT_DENIAL_REASONS.paidPaymentField
    );
    expect(getPaymentFieldEditDenialReason(context, "paid_date")).toBe(
      PAYMENT_EDIT_DENIAL_REASONS.paidPaymentField
    );
    expect(getPaymentFieldEditDenialReason(context, "sale_source")).toBe(
      PAYMENT_EDIT_DENIAL_REASONS.paidPaymentField
    );
    expect(getPaymentFieldEditDenialReason(context, "comment")).toBeNull();
    expect(getPaymentFieldEditDenialReason(context, "invoice_status")).toBeNull();
  });

  test("keeps unpaid non-Stripe Payment fields editable", () => {
    const context = makeContext({ isPaid: false, installmentNumber: 2 });

    for (const field of PAYMENT_EDIT_FIELDS) {
      expect(getPaymentFieldEditDenialReason(context, field)).toBeNull();
    }

    expect(getPaymentPatchDenialReason(context, PAYMENT_EDIT_FIELDS)).toBeNull();
    expect(getPaymentDeleteDenialReason(context)).toBeNull();
  });

  test("denies delete for Stripe Ticket Payments before paid rows", () => {
    const context = makeContext({
      stripeEventId: "cs_test_123",
      installmentNumber: 1,
      isPaid: true,
    });

    expect(getPaymentDeleteDenialReason(context)).toBe(
      PAYMENT_EDIT_DENIAL_REASONS.stripeTicketPaymentDelete
    );
  });

  test("denies delete for paid non-Stripe Payments", () => {
    const context = makeContext({ isPaid: true, installmentNumber: 2 });

    expect(getPaymentDeleteDenialReason(context)).toBe(
      PAYMENT_EDIT_DENIAL_REASONS.paidPaymentDelete
    );
  });

  test("rejects fields outside the operator Payment edit surface", () => {
    const context = makeContext();

    expect(PAYMENT_EDIT_FIELDS).not.toContain("installment_number");
    expect(getPaymentPatchDenialReason(context, ["installment_number"])).toBe(
      PAYMENT_EDIT_DENIAL_REASONS.unsupportedField
    );
  });
});
