import {
  invoiceStatusSchema,
  paymentMethodSchema,
  paymentPlanSchema,
  saleSourceSchema,
  TICKET_TYPE_LIST,
  type InvoiceStatus,
  type PaymentMethod,
  type PaymentPlan,
  type SaleSource,
} from '@/entities/ticket';

// UI labels stay page-owned, but enum values come from the ticket entity so the
// finance table cannot drift from the API/domain contract.
type SelectOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export type { InvoiceStatus, PaymentMethod, PaymentPlan, SaleSource };

function enumOptions<TValue extends string>(
  values: readonly TValue[],
  labels: Record<TValue, string>
): SelectOption<TValue>[] {
  return values.map((value) => ({
    value,
    label: labels[value],
  }));
}

export type TicketGrade = (typeof TICKET_TYPE_LIST)[number];
type EditableInvoiceStatus = Exclude<InvoiceStatus, "not_sent">;

const SALE_SOURCE_LABELS = {
  site: "Сайт",
  direct_transfer: "Прямий переказ",
  other: "Інше",
} satisfies Record<SaleSource, string>;

const PAYMENT_PLAN_LABELS = {
  full: "Повна оплата",
  two_parts: "Розстрочка на 2 частини",
  three_parts: "Розстрочка на 3 частини",
  custom: "Індивідуальний графік",
  free: "Без оплати",
  sponsor: "Спонсорський квиток",
} satisfies Record<PaymentPlan, string>;

const PAYMENT_METHOD_LABELS = {
  nail_moment_company: "Рахунок Nail Moment",
  revolut: "Revolut",
  blik: "BLIK",
  cash: "Готівка",
  bank_transfer: "Банківський переказ",
  other: "Інше",
} satisfies Record<PaymentMethod, string>;

const INVOICE_STATUS_LABELS = {
  not_needed: "Не запитана",
  requested: "Запитана",
  sent: "Надіслана",
} satisfies Record<EditableInvoiceStatus, string>;

const editableInvoiceStatusValues = invoiceStatusSchema.options.filter(
  (value): value is EditableInvoiceStatus => value !== "not_sent"
);

export const SALE_SOURCE_OPTIONS = enumOptions(
  saleSourceSchema.options,
  SALE_SOURCE_LABELS
);
export const PAYMENT_PLAN_OPTIONS = enumOptions(
  paymentPlanSchema.options,
  PAYMENT_PLAN_LABELS
);
export const PAYMENT_METHOD_OPTIONS = enumOptions(
  paymentMethodSchema.options,
  PAYMENT_METHOD_LABELS
);
export const INVOICE_STATUS_OPTIONS = enumOptions(
  editableInvoiceStatusValues,
  INVOICE_STATUS_LABELS
);

export const GRADE_SELECT_OPTIONS = TICKET_TYPE_LIST.map((value) => ({
  value,
  label: value,
})) as { value: TicketGrade; label: TicketGrade }[];

export const saleSourceValues = saleSourceSchema.options;
export const paymentPlanValues = paymentPlanSchema.options;
