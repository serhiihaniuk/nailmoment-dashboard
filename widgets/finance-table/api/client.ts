import type { TicketWithFinance } from '@/shared/db/schema';
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
  getExpectedPaymentCount,
  readApiError,
  splitMoney,
  toMoneyNumber,
} from '../model/utils';

export async function fetchTickets(): Promise<TicketWithFinance[]> {
  const response = await fetch("/api/ticket");
  if (!response.ok) throw await readApiError(response);
  return response.json();
}

export async function saveFinance(
  ticketId: string,
  data: UpsertTicketFinanceInput
): Promise<unknown> {
  const response = await fetch(`/api/ticket/${ticketId}/finance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
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
  return json;
}

export async function patchTicket(
  ticketId: string,
  data: Partial<CreateTicketInput> & {
    updated_grade?: string | null;
    comment?: string;
  }
): Promise<unknown> {
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
  return json;
}

export async function createTicketWithFinance(
  data: CreateTicketWithFinanceInput
): Promise<CreatedFinanceTicket> {
  const isZeroPaymentPlan = getExpectedPaymentCount(data.payment_plan) === 0;
  const grossTotal = isZeroPaymentPlan ? "0.00" : data.gross_total;
  const discountAmount = isZeroPaymentPlan ? "0.00" : data.discount_amount;
  const taxAmount = isZeroPaymentPlan ? "0.00" : data.tax_amount;
  const { ticket } = await createTicket({
    name: data.name,
    email: data.email,
    phone: data.phone,
    instagram: data.instagram,
    grade: data.grade,
  });
  const netTotal = Math.max(
    toMoneyNumber(grossTotal) - toMoneyNumber(taxAmount),
    0
  ).toFixed(2);

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
    const amounts = splitMoney(grossTotal, paymentCount);
    for (let index = 0; index < paymentCount; index += 1) {
      await createPayment(ticket.id, {
        installment_number: index + 1,
        amount: amounts[index] ?? "0.00",
        sale_source: data.payment_sale_source,
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
): Promise<unknown> {
  const response = await fetch(`/api/ticket/${ticketId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw await readApiError(response, { sale_source: "payment_sale_source" });
  }
  return response.json();
}

export async function updatePayment(
  paymentId: string,
  data: PatchPaymentInstallmentInput
): Promise<unknown> {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}

export async function deletePayment(paymentId: string): Promise<unknown> {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await readApiError(response);
  return response.json();
}
