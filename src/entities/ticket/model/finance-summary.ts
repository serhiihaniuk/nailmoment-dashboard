import {
  isZeroPaymentPlan,
  normalizeMoneyString,
  toMoneyNumber,
  type PaymentInstallment,
  type TicketFinance,
  type TicketFinanceSummary,
} from "./ticket";

type FinanceSummaryTotals = {
  payableTotal: number;
  paidTotal: number;
  remainingTotal: number;
};

type FinanceTotalsInput = {
  discount_amount?: unknown;
  gross_total?: unknown;
  payment_plan?: string | null | undefined;
  tax_amount?: unknown;
} | null | undefined;

export type TicketFinanceTotals = {
  discountTotal: number;
  grossTotal: number;
  netTotal: number;
  payableTotal: number;
  taxTotal: number;
};

export function buildTicketFinanceSummary(
  finance: TicketFinance | null,
  payments: PaymentInstallment[]
): TicketFinanceSummary {
  const totals = calculateFinanceSummaryTotals(finance, payments);
  const unpaidPayments = payments.filter((payment) => !payment.is_paid);

  return {
    gross_total: normalizeMoneyString(totals.payableTotal),
    paid_total: normalizeMoneyString(totals.paidTotal),
    remaining_total: normalizeMoneyString(totals.remainingTotal),
    payment_count: payments.length,
    payment_status: getFinancePaymentStatus({
      finance,
      hasOverduePayment: hasOverduePayment(unpaidPayments),
      paidTotal: totals.paidTotal,
      payableTotal: totals.payableTotal,
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
  const { payableTotal } = calculateTicketFinanceTotals(finance);

  const paidTotal = isZeroPaymentPlan(finance?.payment_plan)
    ? 0
    : payments.reduce((sum, payment) => {
        if (!payment.is_paid) return sum;
        return sum + toMoneyNumber(payment.amount);
      }, 0);

  return {
    payableTotal,
    paidTotal,
    remainingTotal: Math.max(payableTotal - paidTotal, 0),
  };
}

export function calculateTicketFinanceTotals(
  finance: FinanceTotalsInput
): TicketFinanceTotals {
  if (isZeroPaymentPlan(finance?.payment_plan)) {
    return {
      discountTotal: 0,
      grossTotal: 0,
      netTotal: 0,
      payableTotal: 0,
      taxTotal: 0,
    };
  }

  const grossTotal = toMoneyNumber(finance?.gross_total);
  const discountTotal = Math.min(
    toMoneyNumber(finance?.discount_amount),
    grossTotal
  );
  const payableTotal = Math.max(grossTotal - discountTotal, 0);
  const taxTotal = toMoneyNumber(finance?.tax_amount);

  return {
    discountTotal,
    grossTotal,
    netTotal: Math.max(payableTotal - taxTotal, 0),
    payableTotal,
    taxTotal,
  };
}

export function getTicketPayableTotalMoney(
  finance: FinanceTotalsInput
): string {
  return normalizeMoneyString(calculateTicketFinanceTotals(finance).payableTotal);
}

export function getTicketNetTotalMoney(finance: FinanceTotalsInput): string {
  return normalizeMoneyString(calculateTicketFinanceTotals(finance).netTotal);
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
  hasOverduePayment: hasOverdue,
  paidTotal,
  payableTotal,
  paymentCount,
}: {
  finance: TicketFinance | null;
  hasOverduePayment: boolean;
  paidTotal: number;
  payableTotal: number;
  paymentCount: number;
}): TicketFinanceSummary["payment_status"] {
  if (!finance && paymentCount === 0) return "untracked";
  if (payableTotal <= 0) return "paid";
  if (paidTotal >= payableTotal) return "paid";
  if (hasOverdue) return "overdue";
  if (paidTotal > 0) return "partial";

  return "unpaid";
}
