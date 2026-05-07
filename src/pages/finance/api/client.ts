import {
  buildPaymentPlanSync,
  calculateTicketFinanceTotals,
  paymentInstallmentSchema,
  parseTicketWithFinanceList,
  parseTicketWithFinance,
  ticketFinanceSchema,
  ticketSchema,
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
  const paymentPlanSync = buildPaymentPlanSync({
    createdPaymentSaleSource: data.payment_sale_source,
    finance: {
      payment_plan: data.payment_plan,
      gross_total: data.gross_total,
      discount_amount: data.discount_amount,
      tax_amount: data.tax_amount,
    },
    paymentPlan: data.payment_plan,
    payments: [],
  });
  if (!paymentPlanSync.ok) {
    throw new ApiError("Unable to prepare the Payment Plan.");
  }

  const grossTotal =
    paymentPlanSync.sync.financePatch.gross_total ?? data.gross_total;
  const discountAmount =
    paymentPlanSync.sync.financePatch.discount_amount ?? data.discount_amount;
  const taxAmount =
    paymentPlanSync.sync.financePatch.tax_amount ?? data.tax_amount;
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

  for (const payment of paymentPlanSync.sync.createPayments) {
    await createPayment(ticket.id, payment);
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
