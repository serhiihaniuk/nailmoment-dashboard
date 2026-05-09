import { describe, expect, test } from "vitest";
import {
  buildTicketFinanceSummary,
  calculateTicketFinanceTotals,
  parseTicketWithFinance,
} from "@/entities/ticket";
import type {
  PaymentInstallment,
  Ticket,
  TicketFinance,
  TicketWithFinance,
} from "../schema";
import { hydrateTicketFinanceRows } from "./ticket-service";

const createdAt = new Date("2026-01-01T10:00:00.000Z");
const futureDueDate = new Date("2030-01-01T10:00:00.000Z");

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "ticket-1",
    stripe_event_id: "manual_ticket-1",
    name: "Customer",
    email: "customer@example.com",
    instagram: "",
    phone: "+48123123123",
    qr_code: "https://example.com/qr.png",
    arrived: false,
    grade: "standard",
    updated_grade: null,
    date: createdAt,
    archived: false,
    mail_sent: false,
    comment: "",
    ...overrides,
  };
}

function makeFinance(overrides: Partial<TicketFinance> = {}): TicketFinance {
  return {
    id: "finance-1",
    ticket_id: "ticket-1",
    sale_source: "site",
    payment_plan: "two_parts",
    gross_total: "500.00",
    discount_amount: "100.00",
    tax_amount: "20.00",
    net_total: "380.00",
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
    amount: "200.00",
    sale_source: "site",
    due_date: futureDueDate,
    paid_date: null,
    is_paid: false,
    payment_method: "blik",
    invoice_status: "not_needed",
    invoice_number: "",
    comment: "",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

function readHydratedTicket(tickets: TicketWithFinance[]): TicketWithFinance {
  const [ticket] = tickets;
  if (!ticket) throw new Error("Expected hydrated ticket fixture");
  return ticket;
}

describe("ticket service finance hydration", () => {
  test("uses the public Ticket domain summary for paid fee-adjusted reads", () => {
    const finance = makeFinance({
      discount_amount: "0.00",
      gross_total: "200.00",
      net_total: "170.00",
      payment_plan: "full",
      tax_amount: "30.00",
    });
    const payments = [
      makePayment({
        amount: "200.00",
        is_paid: true,
        paid_date: createdAt,
      }),
    ];

    const hydratedTicket = readHydratedTicket(
      hydrateTicketFinanceRows(
        [makeTicket()],
        [finance],
        payments,
        buildTicketFinanceSummary
      )
    );

    expect(hydratedTicket.finance_summary).toEqual(
      buildTicketFinanceSummary(finance, payments)
    );
    expect(hydratedTicket.finance_summary).toMatchObject({
      gross_total: "170.00",
      paid_total: "200.00",
      payment_status: "paid",
      remaining_total: "0.00",
    });
    expect(calculateTicketFinanceTotals(hydratedTicket.finance)).toMatchObject({
      grossTotal: 200,
      netTotal: 170,
      payableTotal: 170,
      taxTotal: 30,
    });
    expect(parseTicketWithFinance(hydratedTicket).finance_summary).toEqual(
      hydratedTicket.finance_summary
    );
  });

  test("uses the public Ticket domain summary for partially paid discounted reads", () => {
    const finance = makeFinance();
    const payments = [
      makePayment({
        amount: "150.00",
        is_paid: true,
        paid_date: createdAt,
      }),
      makePayment({
        id: "payment-2",
        amount: "250.00",
        installment_number: 2,
      }),
    ];

    const hydratedTicket = readHydratedTicket(
      hydrateTicketFinanceRows(
        [makeTicket()],
        [finance],
        payments,
        buildTicketFinanceSummary
      )
    );

    expect(hydratedTicket.finance_summary).toEqual(
      buildTicketFinanceSummary(finance, payments)
    );
    expect(hydratedTicket.finance_summary).toMatchObject({
      gross_total: "380.00",
      paid_total: "150.00",
      payment_status: "partial",
      remaining_total: "230.00",
    });
    expect(calculateTicketFinanceTotals(hydratedTicket.finance)).toMatchObject({
      discountTotal: 100,
      grossTotal: 500,
      netTotal: 380,
      payableTotal: 380,
      taxTotal: 20,
    });
    expect(parseTicketWithFinance(hydratedTicket).finance_summary).toEqual(
      hydratedTicket.finance_summary
    );
  });
});
