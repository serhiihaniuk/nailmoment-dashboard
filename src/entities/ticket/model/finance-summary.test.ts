import { describe, expect, test } from "vitest";
import type { PaymentInstallment, TicketFinance } from "./ticket";
import {
  buildTicketFinanceSummary,
  calculateTicketFinanceTotals,
} from "./finance-summary";

const createdAt = new Date("2026-01-01T10:00:00.000Z");

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
    due_date: null,
    is_paid: true,
    paid_date: createdAt,
    payment_method: "blik",
    invoice_status: "not_needed",
    invoice_number: "",
    comment: "",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

describe("ticket finance totals", () => {
  test("applies discount before payable and net totals", () => {
    expect(calculateTicketFinanceTotals(makeFinance())).toMatchObject({
      discountTotal: 100,
      grossTotal: 500,
      netTotal: 380,
      payableTotal: 400,
      taxTotal: 20,
    });
  });

  test("summarizes payment status against discounted payable total", () => {
    const summary = buildTicketFinanceSummary(makeFinance(), [makePayment()]);

    expect(summary.gross_total).toBe("400.00");
    expect(summary.paid_total).toBe("200.00");
    expect(summary.remaining_total).toBe("200.00");
    expect(summary.payment_status).toBe("partial");
  });

  test("uses paid status instead of paid date when summarizing totals", () => {
    const summary = buildTicketFinanceSummary(makeFinance(), [
      makePayment({ is_paid: false }),
    ]);

    expect(summary.paid_total).toBe("0.00");
    expect(summary.remaining_total).toBe("400.00");
    expect(summary.payment_status).toBe("unpaid");
  });

  test("keeps zero-payment plans at zero even if finance has legacy amounts", () => {
    const summary = buildTicketFinanceSummary(
      makeFinance({
        discount_amount: "100.00",
        gross_total: "500.00",
        payment_plan: "free",
      }),
      [makePayment()]
    );

    expect(summary.gross_total).toBe("0.00");
    expect(summary.paid_total).toBe("0.00");
    expect(summary.remaining_total).toBe("0.00");
    expect(summary.payment_status).toBe("paid");
  });
});
