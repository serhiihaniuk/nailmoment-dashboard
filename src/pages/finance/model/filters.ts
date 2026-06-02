import type { TicketWithFinance } from "@/entities/ticket";
import type { InvoiceStatus, SaleSource } from "./constants";
import type { PaymentStatusFilter } from "./types";

export type SaleSourceFilter = "all" | SaleSource;
export type InvoiceStatusFilter = "all" | InvoiceStatus;

export type FinanceTicketFilters = {
  invoiceStatus: InvoiceStatusFilter;
  paymentStatus: PaymentStatusFilter;
  query: string;
  saleSource: SaleSourceFilter;
};

export function filterFinanceTickets(
  tickets: readonly TicketWithFinance[],
  filters: FinanceTicketFilters
): TicketWithFinance[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return tickets
    .filter((ticket) => !ticket.archived)
    .filter((ticket) =>
      matchesPaymentStatusFilter(ticket, filters.paymentStatus)
    )
    .filter((ticket) => matchesSaleSourceFilter(ticket, filters.saleSource))
    .filter((ticket) =>
      matchesInvoiceStatusFilter(ticket, filters.invoiceStatus)
    )
    .filter((ticket) => matchesFinanceQuery(ticket, normalizedQuery));
}

export function hasActiveFinanceFilters(filters: FinanceTicketFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.paymentStatus !== "all" ||
    filters.saleSource !== "all" ||
    filters.invoiceStatus !== "all"
  );
}

function matchesPaymentStatusFilter(
  ticket: TicketWithFinance,
  filter: PaymentStatusFilter
): boolean {
  if (filter === "all") return true;

  const status = ticket.finance_summary.payment_status;
  if (filter === "paid") return status === "paid";
  if (filter === "partial") return status === "partial";
  if (filter === "overdue") return status === "overdue";

  return status === "unpaid" || status === "untracked";
}

function matchesSaleSourceFilter(
  ticket: TicketWithFinance,
  filter: SaleSourceFilter
): boolean {
  if (filter === "all") return true;

  const paymentSources = new Set(
    ticket.payments.map((payment) => payment.sale_source)
  );
  if (paymentSources.size > 0) return paymentSources.has(filter);

  return ticket.finance?.sale_source === filter;
}

function matchesInvoiceStatusFilter(
  ticket: TicketWithFinance,
  filter: InvoiceStatusFilter
): boolean {
  if (filter === "all") return true;

  return getTicketInvoiceFilterStatus(ticket) === filter;
}

function getTicketInvoiceFilterStatus(ticket: TicketWithFinance): InvoiceStatus {
  return ticket.finance_summary.invoice_status ?? "not_needed";
}

function matchesFinanceQuery(
  ticket: TicketWithFinance,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true;

  return [
    ticket.name,
    ticket.email,
    ticket.phone,
    ticket.instagram,
    ticket.finance?.nip,
    ticket.attribution?.utm_source,
    ticket.attribution?.utm_campaign,
    ticket.attribution?.utm_medium,
    ticket.attribution?.utm_content,
    ticket.attribution?.utm_term,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}
