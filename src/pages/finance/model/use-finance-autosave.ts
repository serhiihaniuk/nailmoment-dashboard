import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PaymentInstallment,
  PaymentPlan,
  TicketFinance,
  TicketWithFinance,
} from '@/entities/ticket';
import type {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from '@/shared/db/schema.zod';
import {
  createPayment,
  deletePayment,
  patchTicket,
  saveFinance,
  syncTicketPaymentPlan,
  updatePayment,
} from '../api/client';
import {
  addPaymentToFinanceCache,
  deletePaymentFromFinanceCache,
  patchPaymentInFinanceCache,
  patchPaymentPlanInFinanceCache,
  patchTicketFinanceInCache,
  patchTicketInFinanceCache,
  replacePaymentInFinanceCache,
  replaceTicketFieldsInFinanceCache,
  replaceTicketFinanceInCache,
  replaceTicketInFinanceCache,
  ticketsQueryKey,
  type FinanceTicketPatch,
} from './finance-cache';
import { idleSaveStatus, type SaveStatus } from './autosave-status';

type MutationContext = {
  previousTickets?: TicketWithFinance[] | undefined;
  fieldKey?: string | undefined;
  rollbackChangedField?: (() => void) | undefined;
};

type TicketMutationInput = {
  ticketId: string;
  data: FinanceTicketPatch;
  fieldKey: string;
};

type FinanceMutationInput = {
  ticketId: string;
  data: UpsertTicketFinanceInput;
  fieldKey: string;
};

type PaymentMutationInput = {
  paymentId: string;
  data: PatchPaymentInstallmentInput;
  fieldKey: string;
};

type PaymentPlanMutationInput = {
  ticketId: string;
  paymentPlan: PaymentPlan;
  fieldKey: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не вдалося зберегти.";
}

function findTicket(
  tickets: TicketWithFinance[] | undefined,
  ticketId: string
): TicketWithFinance | undefined {
  return tickets?.find((ticket) => ticket.id === ticketId);
}

function findPayment(
  tickets: TicketWithFinance[] | undefined,
  paymentId: string
): PaymentInstallment | undefined {
  for (const ticket of tickets ?? []) {
    const payment = ticket.payments.find((item) => item.id === paymentId);
    if (payment) return payment;
  }

  return undefined;
}

function buildTicketRollbackPatch(
  ticket: TicketWithFinance,
  data: FinanceTicketPatch
): FinanceTicketPatch {
  const patch: FinanceTicketPatch = {};

  if (data.name !== undefined) patch.name = ticket.name;
  if (data.email !== undefined) patch.email = ticket.email;
  if (data.phone !== undefined) patch.phone = ticket.phone;
  if (data.instagram !== undefined) patch.instagram = ticket.instagram;
  if (data.comment !== undefined) patch.comment = ticket.comment;
  if (data.grade !== undefined && ticket.grade !== "unknown") {
    patch.grade = ticket.grade;
  }
  if (data.updated_grade !== undefined) {
    patch.updated_grade = ticket.updated_grade;
  }

  return patch;
}

function buildFinanceRollbackPatch(
  finance: TicketFinance,
  data: UpsertTicketFinanceInput
): UpsertTicketFinanceInput {
  const patch: UpsertTicketFinanceInput = {};

  if (data.sale_source !== undefined) patch.sale_source = finance.sale_source;
  if (data.payment_plan !== undefined) {
    patch.payment_plan = finance.payment_plan;
  }
  if (data.gross_total !== undefined) patch.gross_total = finance.gross_total;
  if (data.discount_amount !== undefined) {
    patch.discount_amount = finance.discount_amount;
  }
  if (data.tax_amount !== undefined) patch.tax_amount = finance.tax_amount;
  if (data.net_total !== undefined) patch.net_total = finance.net_total;
  if (data.nip !== undefined) patch.nip = finance.nip;
  if (data.finance_note !== undefined) {
    patch.finance_note = finance.finance_note;
  }

  return patch;
}

function buildPaymentRollbackPatch(
  payment: PaymentInstallment,
  data: PatchPaymentInstallmentInput
): PatchPaymentInstallmentInput {
  const patch: PatchPaymentInstallmentInput = {};

  if (data.installment_number !== undefined) {
    patch.installment_number = payment.installment_number;
  }
  if (data.amount !== undefined) patch.amount = payment.amount;
  if (data.sale_source !== undefined) patch.sale_source = payment.sale_source;
  if (data.due_date !== undefined) patch.due_date = payment.due_date;
  if (data.paid_date !== undefined) patch.paid_date = payment.paid_date;
  if (data.payment_method !== undefined) {
    patch.payment_method = payment.payment_method;
  }
  if (data.invoice_status !== undefined) {
    patch.invoice_status = payment.invoice_status;
  }
  if (data.invoice_number !== undefined) {
    patch.invoice_number = payment.invoice_number;
  }
  if (data.comment !== undefined) patch.comment = payment.comment;

  return patch;
}

export function useFinanceAutosave() {
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const savedTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearSavedTimeout = useCallback((fieldKey: string) => {
    const timeoutId = savedTimeouts.current.get(fieldKey);
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    savedTimeouts.current.delete(fieldKey);
  }, []);

  const setFieldStatus = useCallback(
    (fieldKey: string, status: SaveStatus) => {
      clearSavedTimeout(fieldKey);
      setStatuses((current) => ({
        ...current,
        [fieldKey]: status,
      }));

      if (status.state !== "saved") return;

      const timeoutId = setTimeout(() => {
        setStatuses((current) => ({
          ...current,
          [fieldKey]: idleSaveStatus,
        }));
        savedTimeouts.current.delete(fieldKey);
      }, 1800);
      savedTimeouts.current.set(fieldKey, timeoutId);
    },
    [clearSavedTimeout]
  );

  useEffect(() => {
    const timeouts = savedTimeouts.current;

    return () => {
      for (const timeoutId of timeouts.values()) {
        clearTimeout(timeoutId);
      }
      timeouts.clear();
    };
  }, []);

  const markSaving = useCallback(
    (fieldKey: string) => setFieldStatus(fieldKey, { state: "saving" }),
    [setFieldStatus]
  );
  const markSaved = useCallback(
    (fieldKey: string) => setFieldStatus(fieldKey, { state: "saved" }),
    [setFieldStatus]
  );
  const markError = useCallback(
    (fieldKey: string, error: unknown) =>
      setFieldStatus(fieldKey, {
        state: "error",
        message: getErrorMessage(error),
      }),
    [setFieldStatus]
  );

  const getFieldStatus = useCallback(
    (fieldKey: string): SaveStatus => statuses[fieldKey] ?? idleSaveStatus,
    [statuses]
  );

  const restorePreviousTickets = useCallback(
    (context: MutationContext | undefined) => {
      if (context?.rollbackChangedField) {
        context.rollbackChangedField();
        return;
      }

      if (!context?.previousTickets) return;
      queryClient.setQueryData(ticketsQueryKey, context.previousTickets);
    },
    [queryClient]
  );

  const saveTicketMutation = useMutation({
    mutationFn: ({ ticketId, data }: TicketMutationInput) =>
      patchTicket(ticketId, data),
    onMutate: async ({ ticketId, data, fieldKey }) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      const previousTicket = findTicket(previousTickets, ticketId);
      const rollbackPatch = previousTicket
        ? buildTicketRollbackPatch(previousTicket, data)
        : null;
      markSaving(fieldKey);
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) =>
          patchTicketInFinanceCache(current, ticketId, data)
      );
      return {
        previousTickets,
        fieldKey,
        rollbackChangedField: rollbackPatch
          ? () => {
              queryClient.setQueryData<TicketWithFinance[]>(
                ticketsQueryKey,
                (current) =>
                  patchTicketInFinanceCache(current, ticketId, rollbackPatch)
              );
            }
          : undefined,
      } satisfies MutationContext;
    },
    onSuccess: (ticket, { fieldKey }) => {
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replaceTicketFieldsInFinanceCache(current, ticket)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey) markError(context.fieldKey, error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
  });

  const saveFinanceMutation = useMutation({
    mutationFn: ({ ticketId, data }: FinanceMutationInput) =>
      saveFinance(ticketId, data),
    onMutate: async ({ ticketId, data, fieldKey }) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      const previousFinance = findTicket(previousTickets, ticketId)?.finance;
      const rollbackPatch = previousFinance
        ? buildFinanceRollbackPatch(previousFinance, data)
        : null;
      markSaving(fieldKey);
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => patchTicketFinanceInCache(current, ticketId, data)
      );
      return {
        previousTickets,
        fieldKey,
        rollbackChangedField: rollbackPatch
          ? () => {
              queryClient.setQueryData<TicketWithFinance[]>(
                ticketsQueryKey,
                (current) =>
                  patchTicketFinanceInCache(current, ticketId, rollbackPatch)
              );
            }
          : undefined,
      } satisfies MutationContext;
    },
    onSuccess: (finance, { ticketId, fieldKey }) => {
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replaceTicketFinanceInCache(current, ticketId, finance)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey) markError(context.fieldKey, error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ paymentId, data }: PaymentMutationInput) =>
      updatePayment(paymentId, data),
    onMutate: async ({ paymentId, data, fieldKey }) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      const previousPayment = findPayment(previousTickets, paymentId);
      const rollbackPatch = previousPayment
        ? buildPaymentRollbackPatch(previousPayment, data)
        : null;
      markSaving(fieldKey);
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => patchPaymentInFinanceCache(current, paymentId, data)
      );
      return {
        previousTickets,
        fieldKey,
        rollbackChangedField: rollbackPatch
          ? () => {
              queryClient.setQueryData<TicketWithFinance[]>(
                ticketsQueryKey,
                (current) =>
                  patchPaymentInFinanceCache(current, paymentId, rollbackPatch)
              );
            }
          : undefined,
      } satisfies MutationContext;
    },
    onSuccess: (payment, { fieldKey }) => {
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replacePaymentInFinanceCache(current, payment)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey) markError(context.fieldKey, error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
  });

  const syncPaymentPlanMutation = useMutation({
    mutationFn: ({ ticketId, paymentPlan }: PaymentPlanMutationInput) =>
      syncTicketPaymentPlan(ticketId, paymentPlan),
    onMutate: async ({ ticketId, paymentPlan, fieldKey }) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      markSaving(fieldKey);
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => patchPaymentPlanInFinanceCache(current, ticketId, paymentPlan)
      );
      return { previousTickets, fieldKey } satisfies MutationContext;
    },
    onSuccess: (ticket, { fieldKey }) => {
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replaceTicketInFinanceCache(current, ticket)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey) markError(context.fieldKey, error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: InsertPaymentInstallmentInput;
    }) => createPayment(ticketId, data),
    onSuccess: (payment, { ticketId }) => {
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => addPaymentToFinanceCache(current, ticketId, payment)
      );
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onMutate: async (paymentId) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => deletePaymentFromFinanceCache(current, paymentId)
      );
      return { previousTickets } satisfies MutationContext;
    },
    onError: (_error, _variables, context) => {
      restorePreviousTickets(context);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
  });

  return {
    getFieldStatus,
    isSaving:
      saveTicketMutation.isPending ||
      saveFinanceMutation.isPending ||
      updatePaymentMutation.isPending ||
      syncPaymentPlanMutation.isPending ||
      createPaymentMutation.isPending ||
      deletePaymentMutation.isPending,
    createPayment: (ticketId: string, data: InsertPaymentInstallmentInput) =>
      createPaymentMutation.mutate({ ticketId, data }),
    deletePayment: (paymentId: string) => deletePaymentMutation.mutate(paymentId),
    saveFinance: (
      ticketId: string,
      data: UpsertTicketFinanceInput,
      fieldKey: string
    ) => saveFinanceMutation.mutate({ ticketId, data, fieldKey }),
    savePayment: (
      paymentId: string,
      data: PatchPaymentInstallmentInput,
      fieldKey: string
    ) => updatePaymentMutation.mutate({ paymentId, data, fieldKey }),
    savePaymentPlan: (
      ticketId: string,
      paymentPlan: PaymentPlan,
      fieldKey: string
    ) => syncPaymentPlanMutation.mutate({ ticketId, paymentPlan, fieldKey }),
    saveTicket: (ticketId: string, data: FinanceTicketPatch, fieldKey: string) =>
      saveTicketMutation.mutate({ ticketId, data, fieldKey }),
  };
}
