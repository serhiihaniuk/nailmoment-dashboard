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

/**
 * Domain synchronizer for Ticket Payment Plans.
 *
 * This file is the bridge between a Ticket Finance row and the Payment rows an
 * Operator expects to see after choosing `full`, `two_parts`, `three_parts`,
 * `custom`, `free`, or `sponsor`.
 *
 * It deliberately has no database, React Query, or HTTP knowledge. Callers pass
 * the currently hydrated finance/payments and receive a normalized operation
 * plan:
 *
 * 1. patch Ticket Finance;
 * 2. delete unsafe/excess unpaid Payments;
 * 3. patch remaining Payment numbers and unpaid amounts;
 * 4. create missing unpaid Payments.
 *
 * The server route applies those operations to Drizzle. Finance Autosave uses
 * the same result to project optimistic cache state. New Ticket creation passes
 * an empty Payment list to get the initial scheduled Payments from the same
 * rule.
 *
 * Important: paid Payments are protected finance history. Sync may renumber a
 * paid Payment so the final list remains sequential, but it never deletes the
 * row or changes its amount/paid fields.
 */

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

/**
 * Pure operation plan returned by `buildPaymentPlanSync`.
 *
 * The fields are intentionally adapter-shaped instead of persistence-shaped:
 * route handlers can validate and write them to the database, while browser
 * cache code can apply the same operations to already-parsed domain objects.
 */
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

/**
 * Builds the Payment Plan operation set for both server and browser callers.
 *
 * Branch meaning:
 *
 * - `custom` changes only the finance plan and leaves existing Payments alone.
 * - `free`/`sponsor` zero finance totals and remove unpaid Payments.
 * - scheduled plans (`full`, `two_parts`, `three_parts`) preserve paid
 *   Payments, split remaining payable total across unpaid Payments, and create
 *   or delete unpaid rows until the expected schedule is represented.
 *
 * If a plan would require fewer Payment slots than already-paid Payments, the
 * function returns a denial instead of an operation plan. Adapters should avoid
 * writing or projecting anything for denied syncs.
 */
export function buildPaymentPlanSync({
  createdPaymentSaleSource = "direct_transfer",
  finance,
  paymentPlan,
  payments,
}: PaymentPlanSyncInput): PaymentPlanSyncResult {
  const expectedPaymentCount = getExpectedPaymentCount(paymentPlan);
  const sortedPayments = sortPaymentsByInstallment(payments);
  const paidPayments = sortedPayments.filter((payment) => payment.is_paid);

  // A paid Payment is preserved as finance history. Scheduled plans must have
  // enough slots to contain every paid row; zero-payment plans keep paid rows
  // as history while removing only unpaid expectations.
  if (
    expectedPaymentCount !== null &&
    expectedPaymentCount > 0 &&
    expectedPaymentCount < paidPayments.length
  ) {
    return {
      ok: false,
      reason: PAYMENT_PLAN_SYNC_DENIAL_REASONS.paidPaymentCountExceedsPlan,
    };
  }

  if (expectedPaymentCount === null) {
    // Custom plans are explicitly operator-managed. The sync rule records the
    // plan but does not infer a Payment count, split, delete, or create action.
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
    // Free and sponsor Tickets have no scheduled Payments and no payable
    // finance totals. Paid Payments stay visible as historical evidence, while
    // unpaid expected Payments are removed.
    return {
      ok: true,
      sync: buildZeroPaymentPlanSync({
        expectedPaymentCount,
        paymentPlan,
        sortedPayments,
      }),
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

function buildZeroPaymentPlanSync({
  expectedPaymentCount,
  paymentPlan,
  sortedPayments,
}: {
  expectedPaymentCount: 0;
  paymentPlan: PaymentPlan;
  sortedPayments: PaymentInstallment[];
}): PaymentPlanSync {
  const paidPayments = sortedPayments.filter((payment) => payment.is_paid);
  const paymentPatches: PaymentPlanPaymentPatch[] = [];

  for (const [index, payment] of paidPayments.entries()) {
    if (payment.installment_number === index + 1) continue;

    paymentPatches.push({
      paymentId: payment.id,
      patch: {
        installment_number: index + 1,
      },
    });
  }

  return {
    createPayments: [],
    deletePaymentIds: sortedPayments
      .filter((payment) => !payment.is_paid)
      .map((payment) => payment.id),
    expectedPaymentCount,
    financePatch: {
      payment_plan: paymentPlan,
      ...zeroFinancePatch,
    },
    paymentPatches,
    targetPaymentCount: paidPayments.length,
  };
}

/**
 * Applies a sync plan to in-memory Payment objects.
 *
 * Server code does not use this helper because it writes operations to the
 * database directly. Browser optimism uses it to mirror the same delete, patch,
 * create, and sort order before the server response arrives.
 */
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
  // If paid Payments already cover the payable total, do not create extra zero
  // rows just to satisfy the selected schedule. Otherwise keep at least one
  // unpaid slot for the remaining balance even when switching down to `full`.
  const targetPaymentCount = Math.max(
    expectedPaymentCount,
    paidPayments.length + (remainingAfterPaid >= 0.01 ? 1 : 0)
  );
  const paidPaymentIds = new Set(paidPayments.map((payment) => payment.id));
  const removeCount = Math.max(sortedPayments.length - targetPaymentCount, 0);
  // Delete from the end of the unpaid schedule first. Paid ids are excluded so
  // the sync cannot remove historical Payment evidence.
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

    // Renumber every remaining row, including paid rows, so the operator sees a
    // clean 1..N schedule after deletions.
    if (payment.installment_number !== index + 1) {
      patch.installment_number = index + 1;
    }

    // Only unpaid Payment amounts are synchronized. Paid amounts stay exactly
    // as recorded, and the remaining payable amount is split around them.
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

/** Creates the default unpaid Payment shape for scheduled plans. */
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
