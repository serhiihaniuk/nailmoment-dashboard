import { describe, expect, test } from "vitest";
import {
  buildTicketFinanceSummary,
  calculateTicketPaymentCoverage,
  calculateTicketFinanceTotals,
  type PaymentInstallment,
  type TicketFinance,
  type TicketWithFinance,
} from "@/entities/ticket";
import {
  patchPaymentInFinanceCache,
  patchPaymentPlanInFinanceCache,
  patchTicketFinanceInCache,
  patchTicketInFinanceCache,
} from "./finance-cache";

const createdAt = new Date("2026-01-01T10:00:00.000Z");
const futureDueDate = new Date("2030-01-01T10:00:00.000Z");

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
    tax_amount: "20.00",
    net_total: "80.00",
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
    amount: "40.00",
    sale_source: "site",
    due_date: futureDueDate,
    is_paid: false,
    paid_date: null,
    payment_method: "blik",
    invoice_status: "not_needed",
    invoice_number: "",
    comment: "",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

function makeTicket(
  overrides: Partial<TicketWithFinance> = {}
): TicketWithFinance {
  const finance = overrides.finance ?? makeFinance();
  const payments = overrides.payments ?? [makePayment()];

  return {
    id: "ticket-1",
    name: "Old Name",
    email: "old@example.com",
    phone: "+48123123123",
    instagram: "old_handle",
    grade: "standard",
    updated_grade: null,
    comment: "",
    date: createdAt,
    archived: false,
    arrived: false,
    mail_sent: false,
    qr_code: "",
    stripe_event_id: "",
    finance,
    payments,
    finance_summary: {
      gross_total: finance?.gross_total ?? "0.00",
      paid_total: "0.00",
      remaining_total: finance?.gross_total ?? "0.00",
      payment_count: payments.length,
      payment_status: finance ? "unpaid" : "untracked",
      invoice_status: payments.length > 0 ? "not_needed" : null,
      next_due_date: payments[0]?.due_date ?? null,
    },
    ...overrides,
  };
}

function readTicket(cache: TicketWithFinance[]): TicketWithFinance {
  const ticket = cache.find((item) => item.id === "ticket-1");
  if (!ticket) {
    throw new Error("Expected ticket fixture to be present");
  }

  return ticket;
}

describe("finance optimistic cache helpers", () => {
  test("patches ticket fields in cached finance tickets", () => {
    const result = patchTicketInFinanceCache([makeTicket()], "ticket-1", {
      name: "New Name",
      updated_grade: "vip",
    });

    const ticket = readTicket(result);
    expect(ticket.name).toBe("New Name");
    expect(ticket.updated_grade).toBe("vip");
    expect(ticket.finance_summary.remaining_total).toBe("100.00");
  });

  test("patches finance fields and recalculates the summary", () => {
    const result = patchTicketFinanceInCache([makeTicket()], "ticket-1", {
      gross_total: "90",
      tax_amount: "18",
    });

    const ticket = readTicket(result);
    expect(ticket.finance?.gross_total).toBe("90.00");
    expect(ticket.finance?.tax_amount).toBe("18.00");
    expect(ticket.finance_summary.gross_total).toBe("90.00");
    expect(ticket.finance_summary.remaining_total).toBe("90.00");
    expect(ticket.finance_summary.payment_status).toBe("unpaid");
  });

  test("applies finance discounts without subtracting fees when recalculating the summary", () => {
    const result = patchTicketFinanceInCache([makeTicket()], "ticket-1", {
      discount_amount: "25",
      gross_total: "100",
    });

    const ticket = readTicket(result);
    expect(ticket.finance?.gross_total).toBe("100.00");
    expect(ticket.finance?.discount_amount).toBe("25.00");
    expect(ticket.finance_summary.gross_total).toBe("75.00");
    expect(ticket.finance_summary.remaining_total).toBe("75.00");
  });

  test("matches Ticket domain totals for discounted cache updates with separate net total", () => {
    const result = patchTicketFinanceInCache(
      [
        makeTicket({
          finance: makeFinance({
            discount_amount: "100.00",
            gross_total: "500.00",
            net_total: "380.00",
            tax_amount: "20.00",
          }),
          payments: [
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
          ],
        }),
      ],
      "ticket-1",
      {
        tax_amount: "30",
      }
    );

    const ticket = readTicket(result);
    expect(ticket.finance_summary).toEqual(
      buildTicketFinanceSummary(ticket.finance, ticket.payments)
    );
    expect(ticket.finance_summary).toMatchObject({
      gross_total: "400.00",
      paid_total: "150.00",
      payment_status: "partial",
      remaining_total: "250.00",
    });
    expect(calculateTicketFinanceTotals(ticket.finance)).toMatchObject({
      discountTotal: 100,
      grossTotal: 500,
      netTotal: 370,
      payableTotal: 400,
      taxTotal: 30,
    });
  });

  test("patches payment fields and recalculates paid and remaining totals", () => {
    const paidDate = new Date("2026-02-01T10:00:00.000Z");
    const result = patchPaymentInFinanceCache([makeTicket()], "payment-1", {
      is_paid: true,
      paid_date: paidDate,
    });

    const ticket = readTicket(result);
    expect(ticket.payments[0]?.is_paid).toBe(true);
    expect(ticket.payments[0]?.paid_date).toEqual(paidDate);
    expect(ticket.finance_summary.paid_total).toBe("40.00");
    expect(ticket.finance_summary.remaining_total).toBe("60.00");
    expect(ticket.finance_summary.payment_status).toBe("partial");
  });

  test("keeps payment coverage current after optimistic payment amount changes", () => {
    const result = patchPaymentInFinanceCache([makeTicket()], "payment-1", {
      amount: "75.00",
    });

    const ticket = readTicket(result);
    expect(calculateTicketPaymentCoverage(ticket.finance, ticket.payments)).toEqual({
      missingScheduledTotal: 25,
      overScheduledTotal: 0,
      paidTotal: 0,
      payableTotal: 100,
      pendingScheduledTotal: 75,
      scheduledDifference: -25,
      scheduledTotal: 75,
      status: "under_scheduled",
    });
  });

  test("keeps the previous cache snapshot usable for rollback", () => {
    const previous = [makeTicket()];
    const optimistic = patchTicketFinanceInCache(previous, "ticket-1", {
      gross_total: "70",
    });

    expect(readTicket(optimistic).finance?.gross_total).toBe("70.00");
    expect(readTicket(previous).finance?.gross_total).toBe("100.00");
    expect(readTicket(previous).finance_summary.remaining_total).toBe("100.00");
  });

  test("applies zero-payment plans to cached finance and unpaid payments", () => {
    const firstPayment = makePayment({
      id: "payment-1",
      installment_number: 1,
      is_paid: false,
      paid_date: null,
    });
    const secondPayment = makePayment({
      id: "payment-2",
      installment_number: 2,
      is_paid: false,
      paid_date: null,
    });

    const result = patchPaymentPlanInFinanceCache(
      [makeTicket({ payments: [firstPayment, secondPayment] })],
      "ticket-1",
      "free"
    );

    const ticket = readTicket(result);
    expect(ticket.finance?.payment_plan).toBe("free");
    expect(ticket.finance_summary.gross_total).toBe("0.00");
    expect(ticket.finance_summary.remaining_total).toBe("0.00");
    expect(ticket.finance_summary.payment_status).toBe("paid");
    expect(ticket.payments).toEqual([]);
  });

  test("leaves cache unchanged when a payment plan would remove paid payments", () => {
    const paidPayment = makePayment({
      id: "payment-paid",
      is_paid: true,
      paid_date: new Date("2026-02-01T10:00:00.000Z"),
    });
    const unpaidPayment = makePayment({
      id: "payment-unpaid",
      installment_number: 2,
      is_paid: false,
      paid_date: null,
    });

    const result = patchPaymentPlanInFinanceCache(
      [makeTicket({ payments: [paidPayment, unpaidPayment] })],
      "ticket-1",
      "free"
    );

    const ticket = readTicket(result);
    expect(ticket.finance?.payment_plan).toBe("two_parts");
    expect(ticket.payments.map((payment) => payment.id)).toEqual([
      "payment-paid",
      "payment-unpaid",
    ]);
  });

  test("projects scheduled payment plan changes with paid payment preservation", () => {
    const paidDate = new Date("2026-02-01T10:00:00.000Z");
    const paidPayment = makePayment({
      id: "payment-paid",
      amount: "40.00",
      installment_number: 1,
      is_paid: true,
      paid_date: paidDate,
    });
    const unpaidPayment = makePayment({
      id: "payment-unpaid",
      amount: "60.00",
      installment_number: 2,
      is_paid: false,
      paid_date: null,
    });

    const result = patchPaymentPlanInFinanceCache(
      [
        makeTicket({
          finance: makeFinance({
            payment_plan: "two_parts",
            gross_total: "100.00",
            tax_amount: "0.00",
          }),
          payments: [paidPayment, unpaidPayment],
        }),
      ],
      "ticket-1",
      "three_parts"
    );

    const ticket = readTicket(result);
    expect(ticket.finance?.payment_plan).toBe("three_parts");
    expect(ticket.payments).toHaveLength(3);
    expect(ticket.payments[0]).toMatchObject({
      id: "payment-paid",
      amount: "40.00",
      is_paid: true,
      paid_date: paidDate,
    });
    expect(ticket.payments[1]).toMatchObject({
      id: "payment-unpaid",
      amount: "30.00",
      installment_number: 2,
      is_paid: false,
    });
    expect(ticket.payments[2]).toMatchObject({
      id: "optimistic-ticket-1-payment-plan-1",
      amount: "30.00",
      installment_number: 3,
      is_paid: false,
    });
    expect(ticket.finance_summary).toMatchObject({
      paid_total: "40.00",
      payment_count: 3,
      remaining_total: "60.00",
    });
  });
});
