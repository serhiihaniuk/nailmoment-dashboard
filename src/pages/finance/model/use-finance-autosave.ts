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
import {
  createAutosaveOrder,
  type OrderedAutosaveContext,
} from './autosave-order';
import { idleSaveStatus, type SaveStatus } from './autosave-status';

type MutationContext = OrderedAutosaveContext & {
  previousTickets?: TicketWithFinance[] | undefined;
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

type CreatePaymentMutationInput = {
  ticketId: string;
  data: InsertPaymentInstallmentInput;
};

type DeletePaymentMutationInput = {
  ticketId: string;
  paymentId: string;
};

type TicketSaveState = {
  hasError: boolean;
  isSaving: boolean;
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

function getTicketStatusEntries(
  statuses: Record<string, SaveStatus>,
  ticket: TicketWithFinance
): SaveStatus[] {
  const prefixes = [
    `ticket:${ticket.id}:`,
    `finance:${ticket.id}:`,
    ...ticket.payments.map((payment) => `payment:${payment.id}:`),
  ];

  return Object.entries(statuses)
    .filter(([fieldKey]) =>
      prefixes.some((prefix) => fieldKey.startsWith(prefix))
    )
    .map(([, status]) => status);
}

export function useFinanceAutosave() {
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const [paymentActionErrors, setPaymentActionErrors] = useState<
    Record<string, string>
  >({});
  const [paymentActionPendingCounts, setPaymentActionPendingCounts] = useState<
    Record<string, number>
  >({});
  const statusesRef = useRef(statuses);
  const paymentActionErrorsRef = useRef(paymentActionErrors);
  const paymentActionPendingCountsRef = useRef(paymentActionPendingCounts);
  const savedTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const autosaveOrder = useRef<ReturnType<typeof createAutosaveOrder> | null>(
    null
  );

  if (autosaveOrder.current == null) {
    autosaveOrder.current = createAutosaveOrder();
  }
  const order = autosaveOrder.current;

  const clearSavedTimeout = useCallback((fieldKey: string) => {
    const timeoutId = savedTimeouts.current.get(fieldKey);
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    savedTimeouts.current.delete(fieldKey);
  }, []);

  const setFieldStatus = useCallback(
    (fieldKey: string, status: SaveStatus) => {
      clearSavedTimeout(fieldKey);
      const nextStatuses = {
        ...statusesRef.current,
        [fieldKey]: status,
      };
      statusesRef.current = nextStatuses;
      setStatuses(nextStatuses);

      if (status.state !== "saved") return;

      const timeoutId = setTimeout(() => {
        const nextStatusesAfterDelay = {
          ...statusesRef.current,
          [fieldKey]: idleSaveStatus,
        };
        statusesRef.current = nextStatusesAfterDelay;
        setStatuses(nextStatusesAfterDelay);
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

  const getPaymentActionError = useCallback(
    (ticketId: string): string | undefined => paymentActionErrors[ticketId],
    [paymentActionErrors]
  );

  const clearPaymentActionError = useCallback((ticketId: string) => {
    if (!paymentActionErrorsRef.current[ticketId]) return;

    const nextErrors = { ...paymentActionErrorsRef.current };
    delete nextErrors[ticketId];
    paymentActionErrorsRef.current = nextErrors;
    setPaymentActionErrors(nextErrors);
  }, []);

  const setPaymentActionError = useCallback(
    (ticketId: string, error: unknown) => {
      const nextErrors = {
        ...paymentActionErrorsRef.current,
        [ticketId]: getErrorMessage(error),
      };
      paymentActionErrorsRef.current = nextErrors;
      setPaymentActionErrors(nextErrors);
    },
    []
  );

  const incrementPaymentActionPending = useCallback((ticketId: string) => {
    const nextCounts = {
      ...paymentActionPendingCountsRef.current,
      [ticketId]: (paymentActionPendingCountsRef.current[ticketId] ?? 0) + 1,
    };
    paymentActionPendingCountsRef.current = nextCounts;
    setPaymentActionPendingCounts(nextCounts);
  }, []);

  const decrementPaymentActionPending = useCallback((ticketId: string) => {
    const nextCount = Math.max(
      (paymentActionPendingCountsRef.current[ticketId] ?? 0) - 1,
      0
    );
    const nextCounts = { ...paymentActionPendingCountsRef.current };

    if (nextCount > 0) {
      nextCounts[ticketId] = nextCount;
    } else {
      delete nextCounts[ticketId];
    }

    paymentActionPendingCountsRef.current = nextCounts;
    setPaymentActionPendingCounts(nextCounts);
  }, []);

  const getTicketSaveState = useCallback(
    (ticket: TicketWithFinance): TicketSaveState => {
      const ticketStatuses = getTicketStatusEntries(
        statusesRef.current,
        ticket
      );

      return {
        hasError:
          ticketStatuses.some((status) => status.state === "error") ||
          Boolean(paymentActionErrorsRef.current[ticket.id]),
        isSaving:
          ticketStatuses.some((status) => status.state === "saving") ||
          (paymentActionPendingCountsRef.current[ticket.id] ?? 0) > 0,
      };
    },
    []
  );

  const restorePreviousTickets = useCallback(
    (context: MutationContext | undefined) => {
      if (!order.isLatest(context)) return;

      if (context?.rollbackChangedField) {
        context.rollbackChangedField();
        return;
      }

      if (!context?.previousTickets) return;
      queryClient.setQueryData(ticketsQueryKey, context.previousTickets);
    },
    [order, queryClient]
  );

  const saveTicketMutation = useMutation({
    mutationFn: ({ ticketId, data, fieldKey }: TicketMutationInput) =>
      order.run(fieldKey, () => patchTicket(ticketId, data)),
    onMutate: async ({ ticketId, data, fieldKey }) => {
      const fieldVersion = order.begin(fieldKey);
      markSaving(fieldKey);
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      const previousTicket = findTicket(previousTickets, ticketId);
      const rollbackPatch = previousTicket
        ? buildTicketRollbackPatch(previousTicket, data)
        : null;
      if (order.isLatest({ fieldKey, fieldVersion })) {
        queryClient.setQueryData<TicketWithFinance[]>(
          ticketsQueryKey,
          (current) =>
            patchTicketInFinanceCache(current, ticketId, data)
        );
      }
      return {
        previousTickets,
        fieldKey,
        fieldVersion,
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
    onSuccess: (ticket, { fieldKey }, context) => {
      if (!order.isLatest(context)) return;
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replaceTicketFieldsInFinanceCache(current, ticket)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey && order.isLatest(context)) {
        markError(context.fieldKey, error);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (order.isLatest(context)) {
        queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
      }
    },
  });

  const saveFinanceMutation = useMutation({
    mutationFn: ({ ticketId, data, fieldKey }: FinanceMutationInput) =>
      order.run(fieldKey, () => saveFinance(ticketId, data)),
    onMutate: async ({ ticketId, data, fieldKey }) => {
      const fieldVersion = order.begin(fieldKey);
      markSaving(fieldKey);
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      const previousFinance = findTicket(previousTickets, ticketId)?.finance;
      const rollbackPatch = previousFinance
        ? buildFinanceRollbackPatch(previousFinance, data)
        : null;
      if (order.isLatest({ fieldKey, fieldVersion })) {
        queryClient.setQueryData<TicketWithFinance[]>(
          ticketsQueryKey,
          (current) => patchTicketFinanceInCache(current, ticketId, data)
        );
      }
      return {
        previousTickets,
        fieldKey,
        fieldVersion,
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
    onSuccess: (finance, { ticketId, fieldKey }, context) => {
      if (!order.isLatest(context)) return;
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replaceTicketFinanceInCache(current, ticketId, finance)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey && order.isLatest(context)) {
        markError(context.fieldKey, error);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (order.isLatest(context)) {
        queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
      }
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ paymentId, data, fieldKey }: PaymentMutationInput) =>
      order.run(fieldKey, () => updatePayment(paymentId, data)),
    onMutate: async ({ paymentId, data, fieldKey }) => {
      const fieldVersion = order.begin(fieldKey);
      markSaving(fieldKey);
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      const previousPayment = findPayment(previousTickets, paymentId);
      const rollbackPatch = previousPayment
        ? buildPaymentRollbackPatch(previousPayment, data)
        : null;
      if (order.isLatest({ fieldKey, fieldVersion })) {
        queryClient.setQueryData<TicketWithFinance[]>(
          ticketsQueryKey,
          (current) => patchPaymentInFinanceCache(current, paymentId, data)
        );
      }
      return {
        previousTickets,
        fieldKey,
        fieldVersion,
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
    onSuccess: (payment, { fieldKey }, context) => {
      if (!order.isLatest(context)) return;
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replacePaymentInFinanceCache(current, payment)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey && order.isLatest(context)) {
        markError(context.fieldKey, error);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (order.isLatest(context)) {
        queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
      }
    },
  });

  const syncPaymentPlanMutation = useMutation({
    mutationFn: ({
      ticketId,
      paymentPlan,
      fieldKey,
    }: PaymentPlanMutationInput) =>
      order.run(fieldKey, () => syncTicketPaymentPlan(ticketId, paymentPlan)),
    onMutate: async ({ ticketId, paymentPlan, fieldKey }) => {
      const fieldVersion = order.begin(fieldKey);
      markSaving(fieldKey);
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      if (order.isLatest({ fieldKey, fieldVersion })) {
        queryClient.setQueryData<TicketWithFinance[]>(
          ticketsQueryKey,
          (current) =>
            patchPaymentPlanInFinanceCache(current, ticketId, paymentPlan)
        );
      }
      return {
        previousTickets,
        fieldKey,
        fieldVersion,
      } satisfies MutationContext;
    },
    onSuccess: (ticket, { fieldKey }, context) => {
      if (!order.isLatest(context)) return;
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => replaceTicketInFinanceCache(current, ticket)
      );
      markSaved(fieldKey);
    },
    onError: (error, _variables, context) => {
      restorePreviousTickets(context);
      if (context?.fieldKey && order.isLatest(context)) {
        markError(context.fieldKey, error);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (order.isLatest(context)) {
        queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
      }
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({ ticketId, data }: CreatePaymentMutationInput) =>
      createPayment(ticketId, data),
    onMutate: ({ ticketId }) => {
      clearPaymentActionError(ticketId);
      incrementPaymentActionPending(ticketId);
    },
    onSuccess: (payment, { ticketId }) => {
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => addPaymentToFinanceCache(current, ticketId, payment)
      );
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
    onError: (error, { ticketId }) => {
      setPaymentActionError(ticketId, error);
    },
    onSettled: (_data, _error, { ticketId }) => {
      decrementPaymentActionPending(ticketId);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: ({ paymentId }: DeletePaymentMutationInput) =>
      deletePayment(paymentId),
    onMutate: async ({ ticketId, paymentId }) => {
      clearPaymentActionError(ticketId);
      incrementPaymentActionPending(ticketId);
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });
      const previousTickets =
        queryClient.getQueryData<TicketWithFinance[]>(ticketsQueryKey);
      queryClient.setQueryData<TicketWithFinance[]>(
        ticketsQueryKey,
        (current) => deletePaymentFromFinanceCache(current, paymentId)
      );
      return { previousTickets } satisfies MutationContext;
    },
    onError: (error, { ticketId }, context) => {
      restorePreviousTickets(context);
      setPaymentActionError(ticketId, error);
    },
    onSuccess: (_deleted, { ticketId }) => {
      clearPaymentActionError(ticketId);
    },
    onSettled: (_data, _error, { ticketId }) => {
      decrementPaymentActionPending(ticketId);
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
    },
  });

  return {
    getFieldStatus,
    getPaymentActionError,
    getTicketSaveState,
    isSaving:
      saveTicketMutation.isPending ||
      saveFinanceMutation.isPending ||
      updatePaymentMutation.isPending ||
      syncPaymentPlanMutation.isPending ||
      createPaymentMutation.isPending ||
      deletePaymentMutation.isPending,
    createPayment: (ticketId: string, data: InsertPaymentInstallmentInput) =>
      createPaymentMutation.mutate({ ticketId, data }),
    deletePayment: (ticketId: string, paymentId: string) =>
      deletePaymentMutation.mutate({ ticketId, paymentId }),
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
