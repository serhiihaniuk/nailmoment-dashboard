import { describe, expect, test } from "vitest";
import type { PaymentInstallment, PaymentPlan, TicketFinance } from "./ticket";
import {
  buildTicketFinanceSummary,
  calculateTicketPaymentCoverage,
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
  test("applies discount and fee before payable and net totals", () => {
    expect(calculateTicketFinanceTotals(makeFinance())).toMatchObject({
      discountTotal: 100,
      grossTotal: 500,
      netTotal: 380,
      payableTotal: 380,
      taxTotal: 20,
    });
  });

  test("summarizes payment status against discounted and fee-adjusted payable total", () => {
    const summary = buildTicketFinanceSummary(makeFinance(), [makePayment()]);

    expect(summary.gross_total).toBe("380.00");
    expect(summary.paid_total).toBe("200.00");
    expect(summary.remaining_total).toBe("180.00");
    expect(summary.payment_status).toBe("partial");
  });

  test("uses paid status instead of paid date when summarizing totals", () => {
    const summary = buildTicketFinanceSummary(makeFinance(), [
      makePayment({ is_paid: false }),
    ]);

    expect(summary.paid_total).toBe("0.00");
    expect(summary.remaining_total).toBe("380.00");
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

  test("calculates paid, scheduled, and payable payment coverage", () => {
    const coverage = calculateTicketPaymentCoverage(makeFinance(), [
      makePayment({ amount: "200.00", is_paid: true }),
      makePayment({
        id: "payment-2",
        amount: "179.00",
        installment_number: 2,
        is_paid: false,
        paid_date: null,
      }),
    ]);

    expect(coverage).toEqual({
      missingScheduledTotal: 1,
      overScheduledTotal: 0,
      paidTotal: 200,
      payableTotal: 380,
      pendingScheduledTotal: 179,
      scheduledDifference: -1,
      scheduledTotal: 379,
      status: "under_scheduled",
    });
  });

  test("flags over-scheduled payment coverage", () => {
    const coverage = calculateTicketPaymentCoverage(makeFinance(), [
      makePayment({ amount: "250.00", is_paid: true }),
      makePayment({
        id: "payment-2",
        amount: "200.00",
        installment_number: 2,
        is_paid: false,
        paid_date: null,
      }),
    ]);

    expect(coverage).toMatchObject({
      missingScheduledTotal: 0,
      overScheduledTotal: 70,
      pendingScheduledTotal: 200,
      scheduledDifference: 70,
      scheduledTotal: 450,
      status: "over_scheduled",
    });
  });

  test.each<PaymentPlan>(["full", "two_parts", "three_parts", "custom"])(
    "balances scheduled coverage for %s payment plans",
    (paymentPlan) => {
      const coverage = calculateTicketPaymentCoverage(
        makeFinance({ payment_plan: paymentPlan }),
        [
          makePayment({ amount: "200.00", is_paid: true }),
          makePayment({
            id: "payment-2",
            amount: "180.00",
            installment_number: 2,
            is_paid: false,
            paid_date: null,
          }),
        ]
      );

      expect(coverage).toMatchObject({
        missingScheduledTotal: 0,
        overScheduledTotal: 0,
        payableTotal: 380,
        pendingScheduledTotal: 180,
        scheduledDifference: 0,
        scheduledTotal: 380,
        status: "balanced",
      });
    }
  );

  test.each<PaymentPlan>(["free", "sponsor"])(
    "keeps %s payment coverage at zero even if legacy payments exist",
    (paymentPlan) => {
      const coverage = calculateTicketPaymentCoverage(
        makeFinance({ payment_plan: paymentPlan }),
        [makePayment({ amount: "200.00", is_paid: true })]
      );

      expect(coverage).toEqual({
        missingScheduledTotal: 0,
        overScheduledTotal: 0,
        paidTotal: 0,
        payableTotal: 0,
        pendingScheduledTotal: 0,
        scheduledDifference: 0,
        scheduledTotal: 0,
        status: "balanced",
      });
    }
  );
});
