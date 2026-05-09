import type { TicketWithFinance } from '@/entities/ticket';
import type { UpsertTicketFinanceInput } from '@/shared/db/schema.zod';
import {
  calculateTicketFinanceTotals,
  getTicketNetTotalMoney,
  getTicketPayableTotalMoney,
  TICKET_PRICE_BY_GRADE,
  getExpectedPaymentCount,
  isZeroPaymentPlan as isTicketZeroPaymentPlan,
} from '@/entities/ticket';
import { INVOICE_STATUS_OPTIONS } from './constants';
import type {
  ApiIssue,
  CreateTicketWithFinanceInput,
  FieldErrors,
  InvoiceCounts,
  InvoiceStatus,
} from './types';
import { ApiError } from './types';
import { z } from 'zod';

export { getExpectedPaymentCount, isZeroPaymentPlan } from '@/entities/ticket';

// API routes currently return a few compatible error shapes. Normalize them
// here so finance forms can keep one `ApiError`/`fieldErrors` path.
const apiIssueSchema = z.object({
  message: z.string().optional(),
  path: z.array(z.union([z.string(), z.number()])).optional(),
});

const apiErrorPayloadSchema = z
  .object({
    error: z.array(apiIssueSchema).optional(),
    errors: z.array(apiIssueSchema).optional(),
    issues: z.array(apiIssueSchema).optional(),
    message: z.string().optional(),
  })
  .passthrough();

export function normalizeNewTicketFinanceForm(
  form: CreateTicketWithFinanceInput
): CreateTicketWithFinanceInput {
  return {
    ...form,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    instagram: form.instagram?.trim() ?? "",
    gross_total: form.gross_total.trim(),
    discount_amount: form.discount_amount.trim(),
    tax_amount: form.tax_amount.trim(),
    nip: form.nip.trim(),
    finance_note: form.finance_note.trim(),
  };
}

export function zodIssuesToFieldErrors<TField extends string>(
  issues: ApiIssue[],
  fieldMap: Partial<Record<string, TField>> = {}
): FieldErrors<TField> {
  const fieldErrors: FieldErrors<TField> = {};

  for (const issue of issues) {
    if (!issue.message) continue;

    const rawField = issue.path?.[0];
    if (typeof rawField !== "string") continue;

    const field = fieldMap[rawField] ?? (rawField as TField);
    fieldErrors[field] ??= issue.message;
  }

  return fieldErrors;
}

export function getFirstIssueMessage(issues: ApiIssue[]): string | undefined {
  return issues.find((issue) => issue.message)?.message;
}

export async function readApiError(
  response: Response,
  fieldMap: Partial<Record<string, string>> = {}
): Promise<ApiError> {
  const fallbackMessage = response.statusText || "Запит не вдався.";
  const payload = await response.json().catch(() => null);

  const parsedPayload = apiErrorPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return new ApiError(fallbackMessage);
  }

  if (parsedPayload.data.issues) {
    const issues = parsedPayload.data.issues;
    const fieldErrors = zodIssuesToFieldErrors(issues, fieldMap);
    return new ApiError(
      getFirstIssueMessage(issues) ??
        parsedPayload.data.message ??
        fallbackMessage,
      fieldErrors
    );
  }

  if (parsedPayload.data.error) {
    const issues = parsedPayload.data.error;
    const fieldErrors = zodIssuesToFieldErrors(issues, fieldMap);
    return new ApiError(
      getFirstIssueMessage(issues) ??
        parsedPayload.data.message ??
        fallbackMessage,
      fieldErrors
    );
  }

  if (parsedPayload.data.errors) {
    const issues = parsedPayload.data.errors;
    const fieldErrors = zodIssuesToFieldErrors(issues, fieldMap);
    return new ApiError(
      getFirstIssueMessage(issues) ??
        parsedPayload.data.message ??
        fallbackMessage,
      fieldErrors
    );
  }

  if (parsedPayload.data.message) {
    return new ApiError(parsedPayload.data.message);
  }

  return new ApiError(fallbackMessage);
}

export function createNewTicketFinanceDefaults(): CreateTicketWithFinanceInput {
  return {
    name: "",
    email: "",
    phone: "",
    instagram: "",
    grade: "standard",
    payment_sale_source: "direct_transfer",
    payment_plan: "full",
    gross_total: TICKET_PRICE_BY_GRADE.standard,
    discount_amount: "0.00",
    tax_amount: "0.00",
    nip: "",
    finance_note: "",
  };
}

export function getDisplayedPaymentCount(ticket: TicketWithFinance): number {
  const paymentLimit = getExpectedPaymentCount(ticket.finance?.payment_plan ?? "full");
  return paymentLimit ?? Math.max(ticket.payments.length, 1);
}

export function getTicketInvoiceCounts(ticket: TicketWithFinance): InvoiceCounts {
  return ticket.payments.reduce(
    (counts, payment) => {
      const status = getInvoiceStatus(payment.invoice_status);
      counts[status] += 1;
      counts.total += 1;
      return counts;
    },
    {
      requested: 0,
      sent: 0,
      not_needed: 0,
      total: 0,
    }
  );
}

export function getInvoiceStatus(value: string | null | undefined): InvoiceStatus {
  return (
    INVOICE_STATUS_OPTIONS.find((option) => option.value === value)?.value ??
    "not_needed"
  );
}

export function getInvoiceCountsTitle(counts: InvoiceCounts): string {
  return [
    `Надіслана: ${counts.sent}`,
    `Запитана: ${counts.requested}`,
    `Не запитана: ${counts.not_needed}`,
  ].join(" · ");
}

export function pluralizeInvoiceSent(count: number): string {
  return count === 1 ? "Надіслана" : "Надіслані";
}

export function pluralizeInvoiceRequested(count: number): string {
  return count === 1 ? "Запитана" : "Запитані";
}

export function suggestedPaymentAmount(
  ticket: TicketWithFinance,
  paymentNumber: number
): string {
  const expectedPaymentCount = getExpectedPaymentCount(
    ticket.finance?.payment_plan ?? "full"
  );
  const splitCount = expectedPaymentCount || Math.max(paymentNumber, 1);
  return splitMoney(calculatedPaymentTargetTotal(ticket), splitCount)[
    paymentNumber - 1
  ] ?? "0.00";
}

function calculatedPaymentTargetTotal(ticket: TicketWithFinance): string {
  if (isTicketZeroPaymentPlan(ticket.finance?.payment_plan)) return "0.00";
  return getTicketPayableTotalMoney(ticket.finance);
}

export function getUnscheduledGrossPaymentAmount(
  ticket: TicketWithFinance
): string {
  const targetPaymentTotal = toMoneyNumber(calculatedPaymentTargetTotal(ticket));
  const scheduledPaymentTotal = ticket.payments.reduce(
    (total, payment) => total + toMoneyNumber(payment.amount),
    0
  );

  return normalizeMoney(
    Math.max(targetPaymentTotal - scheduledPaymentTotal, 0).toFixed(2)
  );
}

export function splitMoney(value: string, count: number): string[] {
  if (count <= 0) return [];

  const totalCents = Math.max(Math.round(Number(value || 0) * 100), 0);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainderCents ? 1 : 0);
    return (cents / 100).toFixed(2);
  });
}

export function normalizeMoney(value: string): string {
  if (!value) return "0.00";
  const parsed = parseMoneyNumber(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

export function calculatedNetTotal(ticket: TicketWithFinance): string {
  return getTicketNetTotalMoney(ticket.finance);
}

export function calculatedPayableTotal(ticket: TicketWithFinance): string {
  return getTicketPayableTotalMoney(ticket.finance);
}

export function buildFinancePatchWithNet(
  ticket: TicketWithFinance,
  patch: UpsertTicketFinanceInput
): UpsertTicketFinanceInput {
  const totals = calculateTicketFinanceTotals({
    discount_amount:
      patch.discount_amount ?? ticket.finance?.discount_amount ?? "0.00",
    gross_total: patch.gross_total ?? ticket.finance?.gross_total ?? "0.00",
    payment_plan:
      patch.payment_plan ?? ticket.finance?.payment_plan ?? "full",
    tax_amount: patch.tax_amount ?? ticket.finance?.tax_amount ?? "0.00",
  });

  return {
    ...patch,
    net_total: totals.netTotal.toFixed(2),
  };
}

export function toMoneyNumber(value: unknown): number {
  const parsed = parseMoneyNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseMoneyNumber(value: unknown): number {
  if (typeof value === "string") {
    return Number(value.trim().replace(",", ".") || 0);
  }

  return Number(value ?? 0);
}

export function formatZloty(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value);
}

export function formatCompactZloty(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatChartZlotyTooltip(value: unknown): string {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? formatZloty(numericValue) : String(value);
}

export function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return new Intl.NumberFormat("uk-UA", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / total);
}

export function dateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
