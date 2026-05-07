import { describe, expect, test } from "vitest";
import {
  PAYMENT_PLAN_SYNC_DENIAL_REASONS,
  buildPaymentPlanSync,
  projectPaymentPlanSyncPayments,
  type PaymentPlanSync,
} from "./payment-plan-sync";
import type { PaymentInstallment, TicketFinance } from "./ticket";

const createdAt = new Date("2026-01-01T10:00:00.000Z");

function makeFinance(
  overrides: Partial<TicketFinance> = {}
): TicketFinance {
  return {
    id: "finance-1",
    ticket_id: "ticket-1",
    sale_source: "site",
    payment_plan: "two_parts",
    gross_total: "100.00",
    discount_amount: "0.00",
    tax_amount: "0.00",
    net_total: "100.00",
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
    amount: "50.00",
    sale_source: "direct_transfer",
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

function expectSync(result: ReturnType<typeof buildPaymentPlanSync>): PaymentPlanSync {
  if (!result.ok) {
    throw new Error(`Expected sync result, received ${result.reason}`);
  }

  return result.sync;
}

function projectPayments(
  payments: PaymentInstallment[],
  sync: PaymentPlanSync
): PaymentInstallment[] {
  return projectPaymentPlanSyncPayments(payments, sync, (payment, index) => ({
    ...payment,
    id: `created-${index + 1}`,
    ticket_id: "ticket-1",
    created_at: createdAt,
    updated_at: createdAt,
  }));
}

describe("payment plan sync", () => {
  test("switches unpaid two-part plans to three-part plans through one split", () => {
    const payments = [
      makePayment({ id: "payment-1", installment_number: 1 }),
      makePayment({ id: "payment-2", installment_number: 2 }),
    ];
    const sync = expectSync(
      buildPaymentPlanSync({
        finance: makeFinance(),
        paymentPlan: "three_parts",
        payments,
      })
    );

    expect(sync.financePatch).toEqual({ payment_plan: "three_parts" });
    expect(sync.deletePaymentIds).toEqual([]);
    expect(sync.paymentPatches).toEqual([
      { paymentId: "payment-1", patch: { amount: "33.34" } },
      { paymentId: "payment-2", patch: { amount: "33.33" } },
    ]);
    expect(sync.createPayments).toEqual([
      {
        installment_number: 3,
        amount: "33.33",
        sale_source: "direct_transfer",
        is_paid: false,
        paid_date: null,
        due_date: null,
        payment_method: "other",
        invoice_status: "not_needed",
        invoice_number: "",
        comment: "",
      },
    ]);
    expect(projectPayments(payments, sync).map((payment) => payment.amount)).toEqual([
      "33.34",
      "33.33",
      "33.33",
    ]);
  });

  test("switches unpaid three-part plans to full plans by deleting excess unpaid payments", () => {
    const payments = [
      makePayment({ id: "payment-1", installment_number: 1, amount: "33.34" }),
      makePayment({ id: "payment-2", installment_number: 2, amount: "33.33" }),
      makePayment({ id: "payment-3", installment_number: 3, amount: "33.33" }),
    ];
    const sync = expectSync(
      buildPaymentPlanSync({
        finance: makeFinance({ payment_plan: "three_parts" }),
        paymentPlan: "full",
        payments,
      })
    );

    expect(sync.deletePaymentIds).toEqual(["payment-3", "payment-2"]);
    expect(sync.paymentPatches).toEqual([
      { paymentId: "payment-1", patch: { amount: "100.00" } },
    ]);
    expect(projectPayments(payments, sync).map((payment) => payment.id)).toEqual([
      "payment-1",
    ]);
    expect(projectPayments(payments, sync)[0]?.amount).toBe("100.00");
  });

  test("preserves paid payments while switching partially paid three-part plans to two-part plans", () => {
    const paidDate = new Date("2026-02-01T10:00:00.000Z");
    const payments = [
      makePayment({
        id: "payment-paid",
        installment_number: 1,
        amount: "40.00",
        is_paid: true,
        paid_date: paidDate,
      }),
      makePayment({ id: "payment-unpaid-2", installment_number: 2 }),
      makePayment({ id: "payment-unpaid-3", installment_number: 3 }),
    ];
    const sync = expectSync(
      buildPaymentPlanSync({
        finance: makeFinance({ payment_plan: "three_parts" }),
        paymentPlan: "two_parts",
        payments,
      })
    );
    const projected = projectPayments(payments, sync);

    expect(sync.deletePaymentIds).toEqual(["payment-unpaid-3"]);
    expect(sync.paymentPatches).toEqual([
      { paymentId: "payment-unpaid-2", patch: { amount: "60.00" } },
    ]);
    expect(projected).toHaveLength(2);
    expect(projected[0]).toMatchObject({
      id: "payment-paid",
      amount: "40.00",
      is_paid: true,
      paid_date: paidDate,
    });
    expect(projected[1]).toMatchObject({
      id: "payment-unpaid-2",
      amount: "60.00",
      installment_number: 2,
    });
  });

  test("keeps an unpaid remainder when switching a partially paid ticket to full", () => {
    const payments = [
      makePayment({
        id: "payment-paid",
        installment_number: 1,
        amount: "40.00",
        is_paid: true,
      }),
      makePayment({
        id: "payment-unpaid",
        installment_number: 2,
        amount: "60.00",
      }),
    ];
    const sync = expectSync(
      buildPaymentPlanSync({
        finance: makeFinance(),
        paymentPlan: "full",
        payments,
      })
    );

    expect(sync.targetPaymentCount).toBe(2);
    expect(sync.deletePaymentIds).toEqual([]);
    expect(sync.paymentPatches).toEqual([
      { paymentId: "payment-unpaid", patch: { amount: "60.00" } },
    ]);
    expect(projectPayments(payments, sync).map((payment) => payment.amount)).toEqual([
      "40.00",
      "60.00",
    ]);
  });

  test("denies plans with fewer slots than already paid payments", () => {
    const result = buildPaymentPlanSync({
      finance: makeFinance({ payment_plan: "three_parts" }),
      paymentPlan: "full",
      payments: [
        makePayment({
          id: "payment-paid-1",
          installment_number: 1,
          is_paid: true,
        }),
        makePayment({
          id: "payment-paid-2",
          installment_number: 2,
          is_paid: true,
        }),
      ],
    });

    expect(result).toEqual({
      ok: false,
      reason: PAYMENT_PLAN_SYNC_DENIAL_REASONS.paidPaymentCountExceedsPlan,
    });
  });
});
