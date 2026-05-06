import {
  calculateTicketFinanceTotals,
  paymentInstallmentSchema,
  parseTicketWithFinanceList,
  parseTicketWithFinance,
  splitMoney,
  ticketFinanceSchema,
  ticketSchema,
  getExpectedPaymentCount,
  type PaymentInstallment,
  type PaymentPlan,
  type Ticket,
  type TicketFinance,
  type TicketWithFinance,
} from '@/entities/ticket';
import type {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from '@/shared/db/schema.zod';
import type {
  CreateTicketInput,
  CreateTicketWithFinanceInput,
  CreatedFinanceTicket,
} from '../model/types';
import { ApiError } from '../model/types';
import {
  readApiError,
} from '../model/utils';
import { z } from 'zod';

/**
 * Browser API boundary for the finance page.
 *
 * Every function parses response JSON before returning. React Query and UI code
 * should receive `@/entities/ticket` domain types, not trusted response.json()
 * values or raw Drizzle row assumptions.
 */
const createTicketResponseSchema = z.object({
  mailError: z.string().nullable().optional(),
  mailSent: z.boolean().optional(),
  ticket: z.object({
    id: z.string().min(1),
  }),
});

const deletePaymentResponseSchema = z.object({
  id: z.string().min(1),
});

export async function fetchTickets(): Promise<TicketWithFinance[]> {
  const response = await fetch("/api/ticket");
  if (!response.ok) throw await readApiError(response);
  return parseTicketWithFinanceList(await response.json());
}

export async function saveFinance(
  ticketId: string,
  data: UpsertTicketFinanceInput
): Promise<TicketFinance> {
  const response = await fetch(`/api/ticket/${ticketId}/finance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw await readApiError(response);
  return ticketFinanceSchema.parse(await response.json());
}

export async function syncTicketPaymentPlan(
  ticketId: string,
  paymentPlan: PaymentPlan
): Promise<TicketWithFinance> {
  const response = await fetch(`/api/ticket/${ticketId}/finance/payment-plan`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_plan: paymentPlan }),
  });
  if (!response.ok) throw await readApiError(response);
  return parseTicketWithFinance(await response.json());
}

export async function createTicket(body: CreateTicketInput): Promise<{ ticket: { id: string } }> {
  const response = await fetch("/api/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    if (json) {
      throw await readApiError(
        new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
        })
      );
    }
    throw new ApiError(response.statusText || "Не вдалося створити квиток.");
  }
  return createTicketResponseSchema.parse(json);
}

export async function patchTicket(
  ticketId: string,
  data: Partial<CreateTicketInput> & {
    updated_grade?: string | null;
    comment?: string;
  }
): Promise<Ticket> {
  const response = await fetch(`/api/ticket/${ticketId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    if (json) {
      throw await readApiError(
        new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
        })
      );
    }
    throw new ApiError(response.statusText || "Не вдалося оновити квиток.");
  }
  return ticketSchema.parse(json);
}

export async function createTicketWithFinance(
  data: CreateTicketWithFinanceInput
): Promise<CreatedFinanceTicket> {
  // "free" and "sponsor" plans intentionally create finance with zero totals
  // and no installments; keep that normalization before dependent requests.
  const isZeroPaymentPlan = getExpectedPaymentCount(data.payment_plan) === 0;
  const grossTotal = isZeroPaymentPlan ? "0.00" : data.gross_total;
  const discountAmount = isZeroPaymentPlan ? "0.00" : data.discount_amount;
  const taxAmount = isZeroPaymentPlan ? "0.00" : data.tax_amount;
  const ticketInput: CreateTicketInput = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    grade: data.grade,
  };
  if (data.instagram !== undefined) {
    ticketInput.instagram = data.instagram;
  }

  const { ticket } = await createTicket(ticketInput);
  const financeTotals = calculateTicketFinanceTotals({
    discount_amount: discountAmount,
    gross_total: grossTotal,
    payment_plan: data.payment_plan,
    tax_amount: taxAmount,
  });
  const payableTotal = financeTotals.payableTotal.toFixed(2);
  const netTotal = financeTotals.netTotal.toFixed(2);

  await saveFinance(ticket.id, {
    payment_plan: data.payment_plan,
    gross_total: grossTotal,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    net_total: netTotal,
    nip: data.nip,
    finance_note: data.finance_note,
  });

  const paymentCount = getExpectedPaymentCount(data.payment_plan);
  if (paymentCount && paymentCount > 0) {
    const amounts = splitMoney(payableTotal, paymentCount);
    for (let index = 0; index < paymentCount; index += 1) {
      await createPayment(ticket.id, {
        installment_number: index + 1,
        amount: amounts[index] ?? "0.00",
        sale_source: data.payment_sale_source,
        is_paid: false,
        paid_date: "",
        due_date: "",
        payment_method: "other",
        invoice_status: "not_needed",
        invoice_number: "",
        comment: "",
      });
    }
  }

  return ticket;
}

export async function createPayment(
  ticketId: string,
  data: InsertPaymentInstallmentInput
): Promise<PaymentInstallment> {
  const response = await fetch(`/api/ticket/${ticketId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw await readApiError(response, { sale_source: "payment_sale_source" });
  }
  return paymentInstallmentSchema.parse(await response.json());
}

export async function updatePayment(
  paymentId: string,
  data: PatchPaymentInstallmentInput
): Promise<PaymentInstallment> {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw await readApiError(response);
  return paymentInstallmentSchema.parse(await response.json());
}

export async function deletePayment(paymentId: string): Promise<{ id: string }> {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await readApiError(response);
  return deletePaymentResponseSchema.parse(await response.json());
}
