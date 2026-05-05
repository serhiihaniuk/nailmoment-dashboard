import {
  buildTicketFinanceSummary,
  invoiceStatusSchema,
  isZeroPaymentPlan,
  normalizeMoneyString,
  parseTicketGradeOrUnknown,
  paymentMethodSchema,
  paymentPlanSchema,
  saleSourceSchema,
  type PaymentInstallment,
  type PaymentPlan,
  type Ticket,
  type TicketFinance,
  type TicketWithFinance,
} from '@/entities/ticket';
import type {
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from '@/shared/db/schema.zod';
import type { CreateTicketInput } from './types';

export const ticketsQueryKey = ["tickets"] as const;

export type FinanceTicketPatch = Partial<CreateTicketInput> & {
  updated_grade?: string | null;
  comment?: string;
};

function recalculateTicket(ticket: TicketWithFinance): TicketWithFinance {
  const payments = [...ticket.payments].sort(
    (a, b) => a.installment_number - b.installment_number
  );

  return {
    ...ticket,
    payments,
    finance_summary: buildTicketFinanceSummary(ticket.finance, payments),
  };
}

function createOptimisticFinance(ticket: TicketWithFinance): TicketFinance {
  const now = new Date();

  return {
    id: `optimistic-${ticket.id}`,
    ticket_id: ticket.id,
    sale_source: "site",
    payment_plan: "full",
    gross_total: "0.00",
    discount_amount: "0.00",
    tax_amount: "0.00",
    net_total: "0.00",
    nip: "",
    finance_note: "",
    created_at: now,
    updated_at: now,
  };
}

function normalizeNullableDate(value: unknown): Date | null {
  if (value === "" || value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapTickets(
  tickets: TicketWithFinance[] | undefined,
  ticketId: string,
  mapper: (ticket: TicketWithFinance) => TicketWithFinance
): TicketWithFinance[] {
  return (tickets ?? []).map((ticket) =>
    ticket.id === ticketId ? mapper(ticket) : ticket
  );
}

export function replaceTicketInFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  updatedTicket: TicketWithFinance
): TicketWithFinance[] {
  return (tickets ?? []).map((ticket) =>
    ticket.id === updatedTicket.id ? updatedTicket : ticket
  );
}

export function patchTicketInFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  ticketId: string,
  patch: FinanceTicketPatch
): TicketWithFinance[] {
  return mapTickets(tickets, ticketId, (ticket) => {
    const nextTicket = { ...ticket };

    if (patch.name !== undefined) nextTicket.name = patch.name;
    if (patch.email !== undefined) nextTicket.email = patch.email;
    if (patch.phone !== undefined) nextTicket.phone = patch.phone;
    if (patch.instagram !== undefined) nextTicket.instagram = patch.instagram;
    if (patch.comment !== undefined) nextTicket.comment = patch.comment;
    if (patch.grade !== undefined) {
      nextTicket.grade = parseTicketGradeOrUnknown(patch.grade);
    }
    if (patch.updated_grade !== undefined) {
      nextTicket.updated_grade =
        patch.updated_grade === null
          ? null
          : parseTicketGradeOrUnknown(patch.updated_grade);
    }

    return recalculateTicket(nextTicket);
  });
}

export function replaceTicketFieldsInFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  updatedTicket: Ticket
): TicketWithFinance[] {
  return mapTickets(tickets, updatedTicket.id, (ticket) =>
    recalculateTicket({
      ...ticket,
      ...updatedTicket,
    })
  );
}

export function patchTicketFinanceInCache(
  tickets: TicketWithFinance[] | undefined,
  ticketId: string,
  patch: UpsertTicketFinanceInput
): TicketWithFinance[] {
  return mapTickets(tickets, ticketId, (ticket) => {
    const nextFinance = {
      ...(ticket.finance ?? createOptimisticFinance(ticket)),
    };

    if (patch.sale_source !== undefined) {
      nextFinance.sale_source = saleSourceSchema.parse(patch.sale_source);
    }
    if (patch.payment_plan !== undefined) {
      nextFinance.payment_plan = paymentPlanSchema.parse(patch.payment_plan);
    }
    if (patch.gross_total !== undefined) {
      nextFinance.gross_total = normalizeMoneyString(patch.gross_total);
    }
    if (patch.discount_amount !== undefined) {
      nextFinance.discount_amount = normalizeMoneyString(patch.discount_amount);
    }
    if (patch.tax_amount !== undefined) {
      nextFinance.tax_amount = normalizeMoneyString(patch.tax_amount);
    }
    if (patch.net_total !== undefined) {
      nextFinance.net_total = normalizeMoneyString(patch.net_total);
    }
    if (patch.nip !== undefined) {
      nextFinance.nip = String(patch.nip ?? "").trim();
    }
    if (patch.finance_note !== undefined) {
      nextFinance.finance_note = String(patch.finance_note ?? "").trim();
    }

    nextFinance.updated_at = new Date();

    return recalculateTicket({
      ...ticket,
      finance: nextFinance,
    });
  });
}

export function replaceTicketFinanceInCache(
  tickets: TicketWithFinance[] | undefined,
  ticketId: string,
  finance: TicketFinance
): TicketWithFinance[] {
  return mapTickets(tickets, ticketId, (ticket) =>
    recalculateTicket({
      ...ticket,
      finance,
    })
  );
}

export function patchPaymentInFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  paymentId: string,
  patch: PatchPaymentInstallmentInput
): TicketWithFinance[] {
  return (tickets ?? []).map((ticket) => {
    if (!ticket.payments.some((payment) => payment.id === paymentId)) {
      return ticket;
    }

    const payments = ticket.payments.map((payment) =>
      payment.id === paymentId ? patchPayment(payment, patch) : payment
    );

    return recalculateTicket({
      ...ticket,
      payments,
    });
  });
}

export function replacePaymentInFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  payment: PaymentInstallment
): TicketWithFinance[] {
  return (tickets ?? []).map((ticket) => {
    if (!ticket.payments.some((item) => item.id === payment.id)) {
      return ticket;
    }

    return recalculateTicket({
      ...ticket,
      payments: ticket.payments.map((item) =>
        item.id === payment.id ? payment : item
      ),
    });
  });
}

export function addPaymentToFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  ticketId: string,
  payment: PaymentInstallment
): TicketWithFinance[] {
  return mapTickets(tickets, ticketId, (ticket) =>
    recalculateTicket({
      ...ticket,
      payments: [...ticket.payments, payment],
    })
  );
}

export function deletePaymentFromFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  paymentId: string
): TicketWithFinance[] {
  return (tickets ?? []).map((ticket) => {
    if (!ticket.payments.some((payment) => payment.id === paymentId)) {
      return ticket;
    }

    return recalculateTicket({
      ...ticket,
      payments: ticket.payments.filter((payment) => payment.id !== paymentId),
    });
  });
}

export function patchPaymentPlanInFinanceCache(
  tickets: TicketWithFinance[] | undefined,
  ticketId: string,
  paymentPlan: PaymentPlan
): TicketWithFinance[] {
  return mapTickets(tickets, ticketId, (ticket) => {
    const patch: UpsertTicketFinanceInput = { payment_plan: paymentPlan };

    if (isZeroPaymentPlan(paymentPlan)) {
      patch.gross_total = "0.00";
      patch.discount_amount = "0.00";
      patch.tax_amount = "0.00";
      patch.net_total = "0.00";
    }

    const [patchedTicket] = patchTicketFinanceInCache([ticket], ticket.id, patch);
    if (!patchedTicket) return ticket;

    if (!isZeroPaymentPlan(paymentPlan)) return patchedTicket;

    return recalculateTicket({
      ...patchedTicket,
      payments: patchedTicket.payments.filter((payment) => payment.paid_date),
    });
  });
}

function patchPayment(
  payment: PaymentInstallment,
  patch: PatchPaymentInstallmentInput
): PaymentInstallment {
  const nextPayment = { ...payment };

  if (patch.installment_number !== undefined) {
    nextPayment.installment_number = Number(patch.installment_number);
  }
  if (patch.amount !== undefined) {
    nextPayment.amount = normalizeMoneyString(patch.amount);
  }
  if (patch.sale_source !== undefined) {
    nextPayment.sale_source = saleSourceSchema.parse(patch.sale_source);
  }
  if (patch.due_date !== undefined) {
    nextPayment.due_date = normalizeNullableDate(patch.due_date);
  }
  if (patch.paid_date !== undefined) {
    nextPayment.paid_date = normalizeNullableDate(patch.paid_date);
  }
  if (patch.payment_method !== undefined) {
    nextPayment.payment_method = paymentMethodSchema.parse(patch.payment_method);
  }
  if (patch.invoice_status !== undefined) {
    nextPayment.invoice_status = invoiceStatusSchema.parse(patch.invoice_status);
  }
  if (patch.invoice_number !== undefined) {
    nextPayment.invoice_number = String(patch.invoice_number ?? "").trim();
  }
  if (patch.comment !== undefined) {
    nextPayment.comment = String(patch.comment ?? "").trim();
  }

  nextPayment.updated_at = new Date();
  return nextPayment;
}
