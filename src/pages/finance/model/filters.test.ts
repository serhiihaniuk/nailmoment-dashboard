import { describe, expect, test } from "vitest";
import type { PaymentInstallment, TicketFinance, TicketWithFinance } from "@/entities/ticket";
import { filterFinanceTickets, type FinanceTicketFilters } from "./filters";

const createdAt = new Date("2026-01-01T10:00:00.000Z");

const defaultFilters: FinanceTicketFilters = {
  invoiceStatus: "all",
  paymentStatus: "all",
  query: "",
  saleSource: "all",
};

function makeFinance(overrides: Partial<TicketFinance> = {}): TicketFinance {
  return {
    id: "finance-1",
    ticket_id: "ticket-1",
    sale_source: "site",
    payment_plan: "full",
    gross_total: "500.00",
    discount_amount: "0.00",
    tax_amount: "100.00",
    net_total: "400.00",
    nip: "",
    finance_note: "",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

function makePayment(
  overrides: Partial<PaymentInstallment> = {}
): PaymentInstallment {
  return {
    id: "payment-1",
    ticket_id: "ticket-1",
    installment_number: 1,
    amount: "500.00",
    sale_source: "site",
    due_date: null,
    is_paid: false,
    paid_date: null,
    payment_method: "other",
    invoice_status: "not_needed",
    invoice_number: "",
    comment: "",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

function makeTicket(overrides: Partial<TicketWithFinance> = {}): TicketWithFinance {
  const finance = overrides.finance ?? makeFinance();
  const payments = overrides.payments ?? [makePayment()];

  return {
    id: "ticket-1",
    name: "Ticket Owner",
    email: "owner@example.com",
    phone: "+48123123123",
    instagram: "",
    grade: "standard",
    updated_grade: null,
    comment: "",
    date: createdAt,
    archived: false,
    arrived: false,
    mail_sent: false,
    qr_code: "",
    stripe_event_id: "manual_ticket-1",
    attribution: null,
    finance,
    payments,
    finance_summary: {
      gross_total: finance?.gross_total ?? "0.00",
      paid_total: "0.00",
      remaining_total: finance?.gross_total ?? "0.00",
      payment_count: payments.length,
      payment_status: finance ? "unpaid" : "untracked",
      invoice_status: payments.length > 0 ? "not_needed" : null,
      next_due_date: null,
    },
    ...overrides,
  };
}

describe("finance ticket filters", () => {
  test("filters by payment source from payment rows", () => {
    const siteTicket = makeTicket({
      id: "site-ticket",
      payments: [makePayment({ id: "site-payment", sale_source: "site" })],
    });
    const directTicket = makeTicket({
      id: "direct-ticket",
      payments: [
        makePayment({
          id: "direct-payment",
          sale_source: "direct_transfer",
        }),
      ],
    });

    const result = filterFinanceTickets([siteTicket, directTicket], {
      ...defaultFilters,
      saleSource: "direct_transfer",
    });

    expect(result.map((ticket) => ticket.id)).toEqual(["direct-ticket"]);
  });

  test("falls back to finance source when a ticket has no payments", () => {
    const ticket = makeTicket({
      payments: [],
      finance: makeFinance({ sale_source: "direct_transfer" }),
      finance_summary: {
        gross_total: "500.00",
        paid_total: "0.00",
        remaining_total: "500.00",
        payment_count: 0,
        payment_status: "unpaid",
        invoice_status: null,
        next_due_date: null,
      },
    });

    expect(
      filterFinanceTickets([ticket], {
        ...defaultFilters,
        saleSource: "direct_transfer",
      })
    ).toHaveLength(1);
  });

  test("filters by ticket-level invoice summary status", () => {
    const requestedTicket = makeTicket({
      id: "requested-ticket",
      finance_summary: {
        gross_total: "500.00",
        paid_total: "0.00",
        remaining_total: "500.00",
        payment_count: 2,
        payment_status: "unpaid",
        invoice_status: "requested",
        next_due_date: null,
      },
    });
    const sentTicket = makeTicket({
      id: "sent-ticket",
      finance_summary: {
        gross_total: "500.00",
        paid_total: "0.00",
        remaining_total: "500.00",
        payment_count: 1,
        payment_status: "unpaid",
        invoice_status: "sent",
        next_due_date: null,
      },
    });

    const result = filterFinanceTickets([requestedTicket, sentTicket], {
      ...defaultFilters,
      invoiceStatus: "sent",
    });

    expect(result.map((ticket) => ticket.id)).toEqual(["sent-ticket"]);
  });

  test("treats missing invoice summary as not requested", () => {
    const ticket = makeTicket({
      payments: [],
      finance_summary: {
        gross_total: "0.00",
        paid_total: "0.00",
        remaining_total: "0.00",
        payment_count: 0,
        payment_status: "untracked",
        invoice_status: null,
        next_due_date: null,
      },
    });

    expect(
      filterFinanceTickets([ticket], {
        ...defaultFilters,
        invoiceStatus: "not_needed",
      })
    ).toHaveLength(1);
  });
});
