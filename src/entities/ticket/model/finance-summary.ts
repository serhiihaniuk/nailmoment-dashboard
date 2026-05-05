import {
  isZeroPaymentPlan,
  normalizeMoneyString,
  toMoneyNumber,
  type PaymentInstallment,
  type TicketFinance,
  type TicketFinanceSummary,
} from "./ticket";

type FinanceSummaryTotals = {
  grossTotal: number;
  paidTotal: number;
  remainingTotal: number;
};

export function buildTicketFinanceSummary(
  finance: TicketFinance | null,
  payments: PaymentInstallment[]
): TicketFinanceSummary {
  const totals = calculateFinanceSummaryTotals(finance, payments);
  const unpaidPayments = payments.filter((payment) => !payment.paid_date);

  return {
    gross_total: normalizeMoneyString(totals.grossTotal),
    paid_total: normalizeMoneyString(totals.paidTotal),
    remaining_total: normalizeMoneyString(totals.remainingTotal),
    payment_count: payments.length,
    payment_status: getFinancePaymentStatus({
      finance,
      grossTotal: totals.grossTotal,
      hasOverduePayment: hasOverduePayment(unpaidPayments),
      paidTotal: totals.paidTotal,
      paymentCount: payments.length,
    }),
    invoice_status: getFinanceInvoiceStatus(payments),
    next_due_date: getNextDueDate(unpaidPayments),
  };
}

function calculateFinanceSummaryTotals(
  finance: TicketFinance | null,
  payments: PaymentInstallment[]
): FinanceSummaryTotals {
  if (isZeroPaymentPlan(finance?.payment_plan)) {
    return {
      grossTotal: 0,
      paidTotal: 0,
      remainingTotal: 0,
    };
  }

  const grossTotal = toMoneyNumber(finance?.gross_total);
  const paidTotal = payments.reduce((sum, payment) => {
    if (!payment.paid_date) return sum;
    return sum + toMoneyNumber(payment.amount);
  }, 0);

  return {
    grossTotal,
    paidTotal,
    remainingTotal: Math.max(grossTotal - paidTotal, 0),
  };
}

function getNextDueDate(payments: PaymentInstallment[]): Date | null {
  const [nextDueDate] = payments
    .map((payment) => payment.due_date)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  return nextDueDate ?? null;
}

function hasOverduePayment(payments: PaymentInstallment[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return payments.some(
    (payment) => payment.due_date && payment.due_date < today
  );
}

function getFinanceInvoiceStatus(
  payments: PaymentInstallment[]
): TicketFinanceSummary["invoice_status"] {
  if (payments.length === 0) return null;
  if (payments.some((payment) => payment.invoice_status === "requested")) {
    return "requested";
  }
  if (payments.some((payment) => payment.invoice_status === "sent")) {
    return "sent";
  }

  return "not_needed";
}

function getFinancePaymentStatus({
  finance,
  grossTotal,
  hasOverduePayment: hasOverdue,
  paidTotal,
  paymentCount,
}: {
  finance: TicketFinance | null;
  grossTotal: number;
  hasOverduePayment: boolean;
  paidTotal: number;
  paymentCount: number;
}): TicketFinanceSummary["payment_status"] {
  if (!finance && paymentCount === 0) return "untracked";
  if (grossTotal <= 0) return "paid";
  if (paidTotal >= grossTotal) return "paid";
  if (hasOverdue) return "overdue";
  if (paidTotal > 0) return "partial";

  return "unpaid";
}
