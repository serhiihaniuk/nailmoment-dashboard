import type {
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from '@/shared/db/schema.zod';
import type { FinanceTicketPatch } from './finance-cache';

export type SaveStatusState = "idle" | "saving" | "saved" | "error";

export type SaveStatus = {
  state: SaveStatusState;
  message?: string | undefined;
};

export const idleSaveStatus: SaveStatus = { state: "idle" };

export type TicketAutosaveField = keyof FinanceTicketPatch;
export type FinanceAutosaveField = keyof UpsertTicketFinanceInput;
export type PaymentAutosaveField = keyof PatchPaymentInstallmentInput;

export function ticketFieldKey(
  ticketId: string,
  field: TicketAutosaveField
): string {
  return `ticket:${ticketId}:${String(field)}`;
}

export function financeFieldKey(
  ticketId: string,
  field: FinanceAutosaveField
): string {
  return `finance:${ticketId}:${String(field)}`;
}

export function paymentFieldKey(
  paymentId: string,
  field: PaymentAutosaveField
): string {
  return `payment:${paymentId}:${String(field)}`;
}
