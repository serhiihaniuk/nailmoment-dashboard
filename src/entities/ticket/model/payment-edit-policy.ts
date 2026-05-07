import type { PaymentInstallment, Ticket } from "./ticket";

export const PAYMENT_EDIT_FIELDS = [
  "amount",
  "sale_source",
  "due_date",
  "paid_date",
  "is_paid",
  "payment_method",
  "invoice_status",
  "invoice_number",
  "comment",
] as const satisfies readonly (keyof PaymentInstallment)[];

export type PaymentEditField = (typeof PAYMENT_EDIT_FIELDS)[number];

export type PaymentEditPolicyContext = {
  ticket: Pick<Ticket, "stripe_event_id">;
  payment: Pick<PaymentInstallment, "installment_number" | "is_paid">;
};

export const PAYMENT_EDIT_DENIAL_REASONS = {
  unsupportedField: {
    code: "unsupported_payment_field",
    message: "This Payment field cannot be modified.",
  },
  stripeTicketPaymentField: {
    code: "stripe_ticket_payment_field_locked",
    message: "Only invoice fields can be modified for Stripe Ticket Payments.",
  },
  paidPaymentField: {
    code: "paid_payment_field_locked",
    message:
      "Paid Payment amount, paid date, and sale source cannot be modified.",
  },
  stripeTicketPaymentDelete: {
    code: "stripe_ticket_payment_delete_locked",
    message: "Stripe Ticket Payments cannot be deleted.",
  },
  paidPaymentDelete: {
    code: "paid_payment_delete_locked",
    message: "Paid Payments cannot be deleted.",
  },
} as const;

export type PaymentEditDenialReason =
  (typeof PAYMENT_EDIT_DENIAL_REASONS)[keyof typeof PAYMENT_EDIT_DENIAL_REASONS];

const PAYMENT_EDIT_FIELD_SET: ReadonlySet<string> = new Set(
  PAYMENT_EDIT_FIELDS
);

const STRIPE_TICKET_PAYMENT_EDITABLE_FIELD_SET: ReadonlySet<PaymentEditField> =
  new Set<PaymentEditField>(["invoice_status", "invoice_number"]);

const PAID_PAYMENT_LOCKED_FIELD_SET: ReadonlySet<PaymentEditField> =
  new Set<PaymentEditField>(["amount", "paid_date", "sale_source"]);

export function isPaymentEditField(field: string): field is PaymentEditField {
  return PAYMENT_EDIT_FIELD_SET.has(field);
}

export function isStripeTicketPayment({
  payment,
  ticket,
}: PaymentEditPolicyContext): boolean {
  const stripeEventId = ticket.stripe_event_id.trim();

  return (
    stripeEventId.length > 0 &&
    !stripeEventId.startsWith("manual") &&
    payment.installment_number === 1
  );
}

export function getPaymentFieldEditDenialReason(
  context: PaymentEditPolicyContext,
  field: PaymentEditField
): PaymentEditDenialReason | null {
  if (
    isStripeTicketPayment(context) &&
    !STRIPE_TICKET_PAYMENT_EDITABLE_FIELD_SET.has(field)
  ) {
    return PAYMENT_EDIT_DENIAL_REASONS.stripeTicketPaymentField;
  }

  if (context.payment.is_paid && PAID_PAYMENT_LOCKED_FIELD_SET.has(field)) {
    return PAYMENT_EDIT_DENIAL_REASONS.paidPaymentField;
  }

  return null;
}

export function getPaymentPatchDenialReason(
  context: PaymentEditPolicyContext,
  requestedFields: readonly string[]
): PaymentEditDenialReason | null {
  for (const field of requestedFields) {
    if (!isPaymentEditField(field)) {
      return PAYMENT_EDIT_DENIAL_REASONS.unsupportedField;
    }

    const denialReason = getPaymentFieldEditDenialReason(context, field);
    if (denialReason) return denialReason;
  }

  return null;
}

export function getPaymentDeleteDenialReason(
  context: PaymentEditPolicyContext
): PaymentEditDenialReason | null {
  if (isStripeTicketPayment(context)) {
    return PAYMENT_EDIT_DENIAL_REASONS.stripeTicketPaymentDelete;
  }

  if (context.payment.is_paid) {
    return PAYMENT_EDIT_DENIAL_REASONS.paidPaymentDelete;
  }

  return null;
}
