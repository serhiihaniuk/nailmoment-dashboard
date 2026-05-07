import { calculateTicketFinanceTotals } from "./finance-summary";
import {
  getExpectedPaymentCount,
  splitMoney,
  toMoneyNumber,
  type InvoiceStatus,
  type PaymentInstallment,
  type PaymentMethod,
  type PaymentPlan,
  type SaleSource,
  type TicketFinance,
} from "./ticket";

export const PAYMENT_PLAN_SYNC_DENIAL_REASONS = {
  paidPaymentCountExceedsPlan: "paid_payment_count_exceeds_plan",
} as const;

export type PaymentPlanSyncDenialReason =
  (typeof PAYMENT_PLAN_SYNC_DENIAL_REASONS)[keyof typeof PAYMENT_PLAN_SYNC_DENIAL_REASONS];

export type PaymentPlanFinancePatch = {
  payment_plan: PaymentPlan;
  gross_total?: string;
  discount_amount?: string;
  tax_amount?: string;
  net_total?: string;
};

export type PaymentPlanPaymentPatch = {
  paymentId: PaymentInstallment["id"];
  patch: {
    amount?: string;
    installment_number?: number;
  };
};

export type PaymentPlanPaymentCreate = {
  amount: string;
  comment: string;
  due_date: null;
  installment_number: number;
  invoice_number: string;
  invoice_status: InvoiceStatus;
  is_paid: false;
  paid_date: null;
  payment_method: PaymentMethod;
  sale_source: SaleSource;
};

export type PaymentPlanSync = {
  createPayments: PaymentPlanPaymentCreate[];
  deletePaymentIds: string[];
  expectedPaymentCount: number | null;
  financePatch: PaymentPlanFinancePatch;
  paymentPatches: PaymentPlanPaymentPatch[];
  targetPaymentCount: number | null;
};

export type PaymentPlanSyncResult =
  | { ok: true; sync: PaymentPlanSync }
  | { ok: false; reason: PaymentPlanSyncDenialReason };

export type PaymentPlanSyncInput = {
  createdPaymentSaleSource?: SaleSource;
  finance: PaymentPlanSyncFinance;
  paymentPlan: PaymentPlan;
  payments: readonly PaymentInstallment[];
};

export type PaymentPlanSyncFinance =
  | Pick<
      TicketFinance,
      "discount_amount" | "gross_total" | "payment_plan" | "tax_amount"
    >
  | null;

const zeroFinancePatch = {
  gross_total: "0.00",
  discount_amount: "0.00",
  tax_amount: "0.00",
  net_total: "0.00",
} as const;

export function buildPaymentPlanSync({
  createdPaymentSaleSource = "direct_transfer",
  finance,
  paymentPlan,
  payments,
}: PaymentPlanSyncInput): PaymentPlanSyncResult {
  const expectedPaymentCount = getExpectedPaymentCount(paymentPlan);
  const sortedPayments = sortPaymentsByInstallment(payments);
  const paidPayments = sortedPayments.filter((payment) => payment.is_paid);

  if (
    expectedPaymentCount !== null &&
    expectedPaymentCount < paidPayments.length
  ) {
    return {
      ok: false,
      reason: PAYMENT_PLAN_SYNC_DENIAL_REASONS.paidPaymentCountExceedsPlan,
    };
  }

  if (expectedPaymentCount === null) {
    return {
      ok: true,
      sync: {
        createPayments: [],
        deletePaymentIds: [],
        expectedPaymentCount,
        financePatch: { payment_plan: paymentPlan },
        paymentPatches: [],
        targetPaymentCount: null,
      },
    };
  }

  if (expectedPaymentCount === 0) {
    return {
      ok: true,
      sync: {
        createPayments: [],
        deletePaymentIds: sortedPayments
          .filter((payment) => !payment.is_paid)
          .map((payment) => payment.id),
        expectedPaymentCount,
        financePatch: {
          payment_plan: paymentPlan,
          ...zeroFinancePatch,
        },
        paymentPatches: [],
        targetPaymentCount: 0,
      },
    };
  }

  return {
    ok: true,
    sync: buildScheduledPaymentPlanSync({
      expectedPaymentCount,
      finance,
      paymentPlan,
      sortedPayments,
      paidPayments,
      createdPaymentSaleSource,
    }),
  };
}

export function projectPaymentPlanSyncPayments(
  payments: readonly PaymentInstallment[],
  sync: PaymentPlanSync,
  createPayment: (
    payment: PaymentPlanPaymentCreate,
    index: number
  ) => PaymentInstallment
): PaymentInstallment[] {
  const deletedPaymentIds = new Set(sync.deletePaymentIds);
  const patchesByPaymentId = new Map(
    sync.paymentPatches.map((paymentPatch) => [
      paymentPatch.paymentId,
      paymentPatch.patch,
    ])
  );
  const existingPayments = payments
    .filter((payment) => !deletedPaymentIds.has(payment.id))
    .map((payment) => {
      const patch = patchesByPaymentId.get(payment.id);
      return patch ? { ...payment, ...patch } : payment;
    });
  const createdPayments = sync.createPayments.map((payment, index) =>
    createPayment(payment, index)
  );

  return sortPaymentsByInstallment([...existingPayments, ...createdPayments]);
}

function buildScheduledPaymentPlanSync({
  expectedPaymentCount,
  finance,
  paymentPlan,
  paidPayments,
  sortedPayments,
  createdPaymentSaleSource,
}: {
  createdPaymentSaleSource: SaleSource;
  expectedPaymentCount: number;
  finance: PaymentPlanSyncFinance;
  paidPayments: PaymentInstallment[];
  paymentPlan: PaymentPlan;
  sortedPayments: PaymentInstallment[];
}): PaymentPlanSync {
  const { payableTotal } = calculateTicketFinanceTotals(finance);
  const paidTotal = paidPayments.reduce(
    (total, payment) => total + toMoneyNumber(payment.amount),
    0
  );
  const remainingAfterPaid = Math.max(payableTotal - paidTotal, 0);
  const targetPaymentCount = Math.max(
    expectedPaymentCount,
    paidPayments.length + (remainingAfterPaid >= 0.01 ? 1 : 0)
  );
  const paidPaymentIds = new Set(paidPayments.map((payment) => payment.id));
  const removeCount = Math.max(sortedPayments.length - targetPaymentCount, 0);
  const removablePayments = sortedPayments
    .filter((payment) => !paidPaymentIds.has(payment.id))
    .sort((a, b) => b.installment_number - a.installment_number)
    .slice(0, removeCount);
  const removablePaymentIds = new Set(
    removablePayments.map((payment) => payment.id)
  );
  const remainingPayments = sortedPayments
    .filter((payment) => !removablePaymentIds.has(payment.id))
    .sort((a, b) => a.installment_number - b.installment_number);
  const splitAmounts = splitMoney(
    remainingAfterPaid.toFixed(2),
    Math.max(targetPaymentCount - paidPayments.length, 0)
  );
  const paymentPatches: PaymentPlanPaymentPatch[] = [];
  const createPayments: PaymentPlanPaymentCreate[] = [];
  let unpaidPaymentIndex = 0;

  for (const [index, payment] of remainingPayments.entries()) {
    const patch: PaymentPlanPaymentPatch["patch"] = {};

    if (payment.installment_number !== index + 1) {
      patch.installment_number = index + 1;
    }

    if (!payment.is_paid) {
      patch.amount = splitAmounts[unpaidPaymentIndex] ?? "0.00";
      unpaidPaymentIndex += 1;
    }

    if (Object.keys(patch).length > 0) {
      paymentPatches.push({
        paymentId: payment.id,
        patch,
      });
    }
  }

  for (
    let index = remainingPayments.length + 1;
    index <= targetPaymentCount;
    index += 1
  ) {
    createPayments.push(
      createScheduledPayment({
        amount: splitAmounts[unpaidPaymentIndex] ?? "0.00",
        installmentNumber: index,
        saleSource: createdPaymentSaleSource,
      })
    );
    unpaidPaymentIndex += 1;
  }

  return {
    createPayments,
    deletePaymentIds: removablePayments.map((payment) => payment.id),
    expectedPaymentCount,
    financePatch: { payment_plan: paymentPlan },
    paymentPatches,
    targetPaymentCount,
  };
}

function createScheduledPayment({
  amount,
  installmentNumber,
  saleSource,
}: {
  amount: string;
  installmentNumber: number;
  saleSource: SaleSource;
}): PaymentPlanPaymentCreate {
  return {
    installment_number: installmentNumber,
    amount,
    sale_source: saleSource,
    is_paid: false,
    paid_date: null,
    due_date: null,
    payment_method: "other",
    invoice_status: "not_needed",
    invoice_number: "",
    comment: "",
  };
}

function sortPaymentsByInstallment(
  payments: readonly PaymentInstallment[]
): PaymentInstallment[] {
  return [...payments].sort(
    (a, b) => a.installment_number - b.installment_number
  );
}
