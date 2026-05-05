import { TICKET_TYPE_LIST } from '@/shared/const';

export const SALE_SOURCE_OPTIONS = [
  { value: "site", label: "Сайт" },
  { value: "direct_transfer", label: "Прямий переказ" },
  { value: "other", label: "Інше" },
] as const;

export const PAYMENT_PLAN_OPTIONS = [
  { value: "full", label: "Повна оплата" },
  { value: "two_parts", label: "Розстрочка на 2 частини" },
  { value: "three_parts", label: "Розстрочка на 3 частини" },
  { value: "custom", label: "Індивідуальний графік" },
  { value: "free", label: "Без оплати" },
  { value: "sponsor", label: "Спонсорський квиток" },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "nail_moment_company", label: "Рахунок Nail Moment" },
  { value: "revolut", label: "Revolut" },
  { value: "blik", label: "BLIK" },
  { value: "cash", label: "Готівка" },
  { value: "bank_transfer", label: "Банківський переказ" },
  { value: "other", label: "Інше" },
] as const;

export const INVOICE_STATUS_OPTIONS = [
  { value: "not_needed", label: "Не запитана" },
  { value: "requested", label: "Запитана" },
  { value: "sent", label: "Надіслана" },
] as const;

export type SaleSource = (typeof SALE_SOURCE_OPTIONS)[number]["value"];
export type PaymentPlan = (typeof PAYMENT_PLAN_OPTIONS)[number]["value"];
export type TicketGrade = (typeof TICKET_TYPE_LIST)[number];

export const GRADE_SELECT_OPTIONS = TICKET_TYPE_LIST.map((value) => ({
  value,
  label: value,
})) as { value: TicketGrade; label: TicketGrade }[];

export const saleSourceValues = SALE_SOURCE_OPTIONS.map((option) => option.value) as [
  SaleSource,
  ...SaleSource[],
];
export const paymentPlanValues = PAYMENT_PLAN_OPTIONS.map((option) => option.value) as [
  PaymentPlan,
  ...PaymentPlan[],
];
