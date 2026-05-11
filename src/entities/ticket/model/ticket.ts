import { z } from "zod";
import {
  invoiceStatusEnum,
  paymentMethodEnum,
  paymentPlanEnum,
  saleSourceEnum,
} from "@/shared/db/schema";
import {
  TICKET_TYPE,
  TICKET_TYPE_LIST,
  type TicketGrade,
} from "@/shared/db/ticket-grade";

/**
 * Canonical ticket domain boundary.
 *
 * Drizzle schemas in shared/db describe how rows are stored. The schemas here
 * describe the ticket/finance objects that pages and widgets are allowed to
 * trust after route handlers or browser API clients parse external JSON.
 */
export { TICKET_TYPE, TICKET_TYPE_LIST };
export type { TicketGrade };

export const TICKET_PRICE_BY_GRADE: Record<TicketGrade, string> = {
  standard: "199.00",
  maxi: "590.00",
  vip: "949.00",
};

const nonEmptyStringSchema = z.string().trim().min(1);
const dateSchema = z.coerce.date();
const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.date().nullable()
);

// Branded IDs make route params and payment IDs non-interchangeable after parse.
export const ticketIdSchema = nonEmptyStringSchema.brand<"TicketId">();
export type TicketId = z.infer<typeof ticketIdSchema>;

/** Parse an untrusted route/API value into a ticket ID. */
export function parseTicketId(value: unknown): TicketId {
  return ticketIdSchema.parse(value);
}

export const paymentInstallmentIdSchema =
  nonEmptyStringSchema.brand<"PaymentInstallmentId">();
export type PaymentInstallmentId = z.infer<typeof paymentInstallmentIdSchema>;

export function parsePaymentInstallmentId(
  value: unknown
): PaymentInstallmentId {
  return paymentInstallmentIdSchema.parse(value);
}

export const ticketGradeSchema = z.enum(TICKET_TYPE_LIST);

// Read paths use "unknown" so legacy/bad rows do not crash whole dashboards.
export const ticketGradeOrUnknownSchema = z
  .unknown()
  .transform((value) => normalizeTicketGrade(value) ?? "unknown");

export type TicketGradeOrUnknown = z.infer<typeof ticketGradeOrUnknownSchema>;

/** Normalize known grade spelling, including the historical "standart" typo. */
export function normalizeTicketGrade(value: unknown): TicketGrade | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "standart") return TICKET_TYPE.STANDARD;

  const parsed = ticketGradeSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

/** Use for write paths where an invalid grade should fail before persistence. */
export function parseTicketGrade(value: unknown): TicketGrade {
  const normalized = normalizeTicketGrade(value);
  if (!normalized) {
    throw new Error(`Invalid ticket grade: ${String(value)}`);
  }

  return normalized;
}

export function parseTicketGradeOrUnknown(value: unknown): TicketGradeOrUnknown {
  return ticketGradeOrUnknownSchema.parse(value);
}

// Money travels over JSON as strings. Normalize to non-negative "0.00" strings.
export const moneyStringSchema = z
  .unknown()
  .transform((value) => normalizeMoneyString(value));

export function parseMoneyNumber(value: unknown): number {
  if (typeof value === "string") {
    return Number(value.trim().replace(",", ".") || 0);
  }

  return Number(value ?? 0);
}

export function toMoneyNumber(value: unknown): number {
  const parsed = parseMoneyNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeMoneyString(value: unknown): string {
  const parsed = toMoneyNumber(value);
  return Math.max(parsed, 0).toFixed(2);
}

/** Split money in cents so installments sum back to the original amount. */
export function splitMoney(value: string, count: number): string[] {
  if (count <= 0) return [];

  const totalCents = Math.max(Math.round(toMoneyNumber(value) * 100), 0);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainderCents ? 1 : 0);
    return (cents / 100).toFixed(2);
  });
}

export const saleSourceSchema = z.enum(saleSourceEnum.enumValues);
export const paymentPlanSchema = z.enum(paymentPlanEnum.enumValues);
export const paymentMethodSchema = z.enum(paymentMethodEnum.enumValues);
export const invoiceStatusSchema = z.enum(invoiceStatusEnum.enumValues);
export const financePaymentStatusSchema = z.enum([
  "untracked",
  "unpaid",
  "partial",
  "paid",
  "overdue",
]);

export type SaleSource = z.infer<typeof saleSourceSchema>;
export type PaymentPlan = z.infer<typeof paymentPlanSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type FinancePaymentStatus = z.infer<typeof financePaymentStatusSchema>;

export function getExpectedPaymentCount(plan: PaymentPlan): number | null {
  if (plan === "full") return 1;
  if (plan === "two_parts") return 2;
  if (plan === "three_parts") return 3;
  if (plan === "free" || plan === "sponsor") return 0;
  return null;
}

export function isZeroPaymentPlan(
  plan: string | null | undefined
): boolean {
  return plan === "free" || plan === "sponsor";
}

// Browser-facing response schemas. Keep route/client responses aligned here.
export const ticketSchema = z.object({
  archived: z.boolean(),
  arrived: z.boolean(),
  comment: z.string(),
  date: dateSchema,
  email: z.string(),
  grade: ticketGradeOrUnknownSchema,
  id: z.string(),
  instagram: z.string(),
  mail_sent: z.boolean(),
  name: z.string(),
  phone: z.string(),
  qr_code: z.string(),
  stripe_event_id: z.string(),
  updated_grade: ticketGradeOrUnknownSchema.nullable(),
});

export const ticketAttributionSchema = z.object({
  created_at: dateSchema,
  id: z.string(),
  landing_page: z.string().nullable(),
  referrer: z.string().nullable(),
  source: z.string(),
  stripe_session_id: z.string(),
  ticket_id: z.string().nullable(),
  updated_at: dateSchema,
  utm_campaign: z.string().nullable(),
  utm_content: z.string().nullable(),
  utm_medium: z.string().nullable(),
  utm_source: z.string().nullable(),
  utm_term: z.string().nullable(),
});

export const ticketFinanceSchema = z.object({
  created_at: dateSchema,
  discount_amount: moneyStringSchema,
  finance_note: z.string(),
  gross_total: moneyStringSchema,
  id: z.string(),
  net_total: moneyStringSchema,
  nip: z.string(),
  payment_plan: paymentPlanSchema,
  sale_source: saleSourceSchema,
  tax_amount: moneyStringSchema,
  ticket_id: z.string(),
  updated_at: dateSchema,
});

export const paymentInstallmentSchema = z.object({
  amount: moneyStringSchema,
  comment: z.string(),
  created_at: dateSchema,
  due_date: nullableDateSchema,
  id: z.string(),
  installment_number: z.number().int(),
  is_paid: z.boolean(),
  invoice_number: z.string(),
  invoice_status: invoiceStatusSchema,
  paid_date: nullableDateSchema,
  payment_method: paymentMethodSchema,
  sale_source: saleSourceSchema,
  ticket_id: z.string(),
  updated_at: dateSchema,
});

export const ticketFinanceSummarySchema = z.object({
  gross_total: moneyStringSchema,
  invoice_status: invoiceStatusSchema.nullable(),
  next_due_date: nullableDateSchema,
  paid_total: moneyStringSchema,
  payment_count: z.number().int().nonnegative(),
  payment_status: financePaymentStatusSchema,
  remaining_total: moneyStringSchema,
});

export const ticketWithFinanceSchema = ticketSchema.extend({
  attribution: ticketAttributionSchema.nullable().default(null),
  finance: ticketFinanceSchema.nullable(),
  finance_summary: ticketFinanceSummarySchema,
  payments: z.array(paymentInstallmentSchema),
});

export const ticketWithFinanceListSchema = z.array(ticketWithFinanceSchema);

export type Ticket = z.infer<typeof ticketSchema>;
export type TicketAttribution = z.infer<typeof ticketAttributionSchema>;
export type TicketFinance = z.infer<typeof ticketFinanceSchema>;
export type PaymentInstallment = z.infer<typeof paymentInstallmentSchema>;
export type TicketFinanceSummary = z.infer<typeof ticketFinanceSummarySchema>;
export type TicketWithFinance = z.infer<typeof ticketWithFinanceSchema>;

/** Parse a single ticket API response before a widget consumes it. */
export function parseTicket(value: unknown): Ticket {
  return ticketSchema.parse(value);
}

/** Parse the ticket detail shape used by ticket panels and finance pages. */
export function parseTicketWithFinance(value: unknown): TicketWithFinance {
  return ticketWithFinanceSchema.parse(value);
}

/** Parse the ticket list shape returned by dashboard/finance API reads. */
export function parseTicketWithFinanceList(value: unknown): TicketWithFinance[] {
  return ticketWithFinanceListSchema.parse(value);
}
