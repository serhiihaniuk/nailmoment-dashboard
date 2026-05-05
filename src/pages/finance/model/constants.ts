import { TICKET_TYPE_LIST } from '@/entities/ticket';
import {
  invoiceStatusEnum,
  paymentMethodEnum,
  paymentPlanEnum,
  saleSourceEnum,
} from '@/shared/db/schema';

type SelectOption<TValue extends string> = {
  value: TValue;
  label: string;
};

function enumOptions<TValue extends string>(
  values: readonly TValue[],
  labels: Record<TValue, string>
): SelectOption<TValue>[] {
  return values.map((value) => ({
    value,
    label: labels[value],
  }));
}

export type SaleSource = (typeof saleSourceEnum.enumValues)[number];
export type PaymentPlan = (typeof paymentPlanEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type TicketGrade = (typeof TICKET_TYPE_LIST)[number];
type InvoiceStatusValue = (typeof invoiceStatusEnum.enumValues)[number];
type EditableInvoiceStatus = Exclude<InvoiceStatusValue, "not_sent">;

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

const editableInvoiceStatusValues = invoiceStatusEnum.enumValues.filter(
  (value): value is EditableInvoiceStatus => value !== "not_sent"
);

export const SALE_SOURCE_OPTIONS = enumOptions(
  saleSourceEnum.enumValues,
  SALE_SOURCE_LABELS
);
export const PAYMENT_PLAN_OPTIONS = enumOptions(
  paymentPlanEnum.enumValues,
  PAYMENT_PLAN_LABELS
);
export const PAYMENT_METHOD_OPTIONS = enumOptions(
  paymentMethodEnum.enumValues,
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

export const saleSourceValues = saleSourceEnum.enumValues;
export const paymentPlanValues = paymentPlanEnum.enumValues;
