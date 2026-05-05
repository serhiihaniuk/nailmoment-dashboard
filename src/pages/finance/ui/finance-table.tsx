'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import type { TicketWithFinance } from '@/shared/db/schema';
import type {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from '@/shared/db/schema.zod';
import { cn } from '@/shared/lib/cn';
import {
  createPayment,
  createTicketWithFinance,
  deletePayment,
  fetchTickets,
  patchTicket,
  saveFinance,
  updatePayment,
} from '../api/client';
import { type PaymentPlan } from '../model/constants';
import type { CreateTicketInput, PaymentStatusFilter as PaymentStatusFilterValue } from '../model/types';
import {
  calculatedNetTotal,
  formatDate,
  formatZloty,
  getDisplayedPaymentCount,
  getExpectedPaymentCount,
  isZeroPaymentPlan,
  splitMoney,
  toMoneyNumber,
} from '../model/utils';
import { FinanceCharts, buildFinanceCharts } from './finance-charts';
import { NewTicketFinanceDialog } from './new-ticket-finance-dialog';
import { PaymentsPanel } from './payments-panel';
import {
  GradeMarker,
  InvoiceStatusCell,
  PaymentStatusFilter,
  StatusIndicator,
} from './table-cells';

export function FinanceTable() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilterValue>("all");
  const [planErrors, setPlanErrors] = useState<Record<string, string>>({});
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const { data, isLoading, isFetching, isError } = useQuery<
    TicketWithFinance[],
    Error
  >({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    staleTime: Infinity,
  });

  const saveFinanceMutation = useMutation({
    mutationFn: ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: UpsertTicketFinanceInput;
    }) => saveFinance(ticketId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: PatchPaymentInstallmentInput;
    }) => updatePayment(paymentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: InsertPaymentInstallmentInput;
    }) => createPayment(ticketId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: Partial<CreateTicketInput> & {
        updated_grade?: string | null;
        comment?: string;
      };
    }) => patchTicket(ticketId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const createTicketMutation = useMutation({
    mutationFn: createTicketWithFinance,
    onSuccess: (ticket) => {
      setOpenTicketId(ticket.id);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
    },
  });

  const syncPlanMutation = useMutation({
    mutationFn: async ({
      ticket,
      paymentPlan,
    }: {
      ticket: TicketWithFinance;
      paymentPlan: PaymentPlan;
    }) => {
      const expectedPaymentCount = getExpectedPaymentCount(paymentPlan);
      const sortedPayments = [...ticket.payments].sort(
        (a, b) => a.installment_number - b.installment_number
      );
      const paidPayments = sortedPayments.filter((payment) => payment.paid_date);

      if (
        expectedPaymentCount !== null &&
        expectedPaymentCount < paidPayments.length
      ) {
        throw new Error(
          "Не можна вибрати менше платежів, ніж уже оплачено."
        );
      }

      if (expectedPaymentCount === null) {
        await saveFinance(ticket.id, { payment_plan: paymentPlan });
        return;
      }

      if (expectedPaymentCount === 0) {
        await saveFinance(ticket.id, {
          payment_plan: paymentPlan,
          gross_total: "0.00",
          discount_amount: "0.00",
          tax_amount: "0.00",
          net_total: "0.00",
        });

        for (const payment of sortedPayments.filter(
          (payment) => !payment.paid_date
        )) {
          await deletePayment(payment.id);
        }

        return;
      }

      await saveFinance(ticket.id, { payment_plan: paymentPlan });

      const remainingAfterPaid = Math.max(
        toMoneyNumber(ticket.finance?.gross_total) -
          paidPayments.reduce(
            (total, payment) => total + toMoneyNumber(payment.amount),
            0
          ),
        0
      );
      const targetPaymentCount = Math.max(
        expectedPaymentCount,
        paidPayments.length + (remainingAfterPaid >= 0.01 ? 1 : 0)
      );
      const paidPaymentIds = new Set(paidPayments.map((payment) => payment.id));
      const removeCount = Math.max(
        sortedPayments.length - targetPaymentCount,
        0
      );
      const removablePayments = sortedPayments
        .filter((payment) => !paidPaymentIds.has(payment.id))
        .sort((a, b) => b.installment_number - a.installment_number)
        .slice(0, removeCount);
      const removablePaymentIds = new Set(
        removablePayments.map((payment) => payment.id)
      );

      for (const payment of removablePayments) {
        await deletePayment(payment.id);
      }

      const splitAmounts = splitMoney(
        remainingAfterPaid.toFixed(2),
        Math.max(targetPaymentCount - paidPayments.length, 0)
      );
      const remainingPayments = sortedPayments
        .filter((payment) => !removablePaymentIds.has(payment.id))
        .sort((a, b) => a.installment_number - b.installment_number);
      let unpaidPaymentIndex = 0;

      for (let index = 0; index < remainingPayments.length; index += 1) {
        const payment = remainingPayments[index];
        const patch: PatchPaymentInstallmentInput = {};

        if (payment.installment_number !== index + 1) {
          patch.installment_number = index + 1;
        }

        if (!payment.paid_date) {
          patch.amount = splitAmounts[unpaidPaymentIndex] ?? "0.00";
          unpaidPaymentIndex += 1;
        }

        if (Object.keys(patch).length > 0) {
          await updatePayment(payment.id, patch);
        }
      }

      for (
        let index = remainingPayments.length + 1;
        index <= targetPaymentCount;
        index += 1
      ) {
        await createPayment(ticket.id, {
          installment_number: index,
          amount: splitAmounts[unpaidPaymentIndex] ?? "0.00",
          sale_source: "direct_transfer",
          paid_date: "",
          due_date: "",
          payment_method: "other",
          invoice_status: "not_needed",
          invoice_number: "",
          comment: "",
        });
        unpaidPaymentIndex += 1;
      }
    },
    onMutate: ({ ticket }) => {
      setPlanErrors((current) => {
        const next = { ...current };
        delete next[ticket.id];
        return next;
      });
    },
    onError: (error, { ticket }) => {
      setPlanErrors((current) => ({
        ...current,
        [ticket.id]:
          error instanceof Error
            ? error.message
            : "Не вдалося змінити план оплати.",
      }));
    },
    onSuccess: (_data, { ticket }) => {
      setPlanErrors((current) => {
        const next = { ...current };
        delete next[ticket.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const tickets = useMemo(() => {
    let activeTickets = (data ?? []).filter((ticket) => !ticket.archived);
    
    // Apply status filter
    if (statusFilter !== "all") {
      activeTickets = activeTickets.filter((ticket) => {
        const status = ticket.finance_summary.payment_status;
        if (statusFilter === "paid") return status === "paid";
        if (statusFilter === "partial") return status === "partial";
        if (statusFilter === "overdue") return status === "overdue";
        if (statusFilter === "pending") return status === "unpaid" || status === "untracked";
        return true;
      });
    }
    
    // Apply search
    if (!query.trim()) return activeTickets;

    const normalizedQuery = query.trim().toLowerCase();
    return activeTickets.filter((ticket) =>
      [
        ticket.name,
        ticket.email,
        ticket.phone,
        ticket.instagram,
        ticket.finance?.nip,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery))
    );
  }, [data, query, statusFilter]);

  const financeTotals = useMemo(() => {
    return tickets.reduce(
      (totals, ticket) => {
        totals.gross += toMoneyNumber(ticket.finance_summary.gross_total);
        totals.paid += toMoneyNumber(ticket.finance_summary.paid_total);
        totals.remaining += toMoneyNumber(ticket.finance_summary.remaining_total);
        if (ticket.finance_summary.payment_status === "overdue") {
          totals.overdue += 1;
        }
        return totals;
      },
      { gross: 0, paid: 0, remaining: 0, overdue: 0 }
    );
  }, [tickets]);

  const financeCharts = useMemo(() => buildFinanceCharts(tickets), [tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === openTicketId) ?? null,
    [openTicketId, tickets]
  );

  const isSaving =
    saveFinanceMutation.isPending ||
    updatePaymentMutation.isPending ||
    createPaymentMutation.isPending ||
    deletePaymentMutation.isPending ||
    updateTicketMutation.isPending ||
    createTicketMutation.isPending ||
    syncPlanMutation.isPending;

  const openTicketPayments = (ticketId: string) => {
    setOpenTicketId(ticketId);
  };

  if (isLoading) {
    return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading-1">Фінанси</h2>
        <NewTicketFinanceDialog
          isPending={createTicketMutation.isPending}
          onCreate={(data) => createTicketMutation.mutateAsync(data)}
        />
      </div>

      {/* Summary stats - compact inline */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <span className="text-muted-foreground">{tickets.length} квитків</span>
        <span className="hidden md:inline text-border">|</span>
        <span><span className="text-muted-foreground">До оплати:</span> <span className="font-semibold tabular-nums">{formatZloty(financeTotals.gross)}</span></span>
        <span><span className="text-muted-foreground">Оплачено:</span> <span className="font-semibold tabular-nums text-success">{formatZloty(financeTotals.paid)}</span></span>
        <span><span className="text-muted-foreground">Залишилось:</span> <span className="font-semibold tabular-nums">{formatZloty(financeTotals.remaining)}</span></span>
        {financeTotals.overdue > 0 && (
          <span><span className="text-muted-foreground">Прострочено:</span> <span className="font-semibold tabular-nums text-destructive">{financeTotals.overdue}</span></span>
        )}
      </div>

      {isError && (
        <p className="text-destructive font-medium">
          Помилка завантаження фінансів
        </p>
      )}

      <FinanceCharts data={financeCharts} />

      {/* Main table */}
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border/40">
          <div className="relative w-full sm:w-auto sm:min-w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
            />
            <Input
              placeholder="Пошук..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9 h-9 border-border/50 text-base md:text-[13px] placeholder:text-muted-foreground/40"
            />
          </div>
          <PaymentStatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full min-w-240">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-65">
                  Клієнт
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-17.5">
                  Дата
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-25">
                  До оплати
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-25">
                  Оплачено
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">
                  Платежі
                </TableHead>
                <TableHead className="h-10 px-4 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32">
                  Рахунок-фактура
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-20">
                  Податок
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-25">
                  Нетто
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-22.5">
                  Статус
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    {query || statusFilter !== "all" ? "Нічого не знайдено" : "Фінансових записів ще немає"}
                  </TableCell>
                </TableRow>
              )}
              {tickets.map((ticket, index) => {
                const grossTotal = toMoneyNumber(
                  ticket.finance_summary.gross_total
                );
                const taxAmount = isZeroPaymentPlan(
                  ticket.finance?.payment_plan
                )
                  ? 0
                  : toMoneyNumber(ticket.finance?.tax_amount);
                const paidTotal = toMoneyNumber(ticket.finance_summary.paid_total);
                const netTotal = toMoneyNumber(calculatedNetTotal(ticket));
                const status = ticket.finance_summary.payment_status;
                const isOverdue = status === "overdue";
                const displayedPaymentCount = getDisplayedPaymentCount(ticket);

                return (
                  <TableRow
                    key={ticket.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "cursor-pointer border-b border-border/30 last:border-0",
                      openTicketId === ticket.id && "bg-muted/40",
                      isOverdue && "bg-destructive/2"
                    )}
                    onClick={(event) => {
                      const interactiveTarget = (
                        event.target as HTMLElement
                      ).closest("button,a,textarea,select");
                      if (interactiveTarget) return;
                      openTicketPayments(ticket.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      openTicketPayments(ticket.id);
                    }}
                  >
                    <TableCell className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <div className="flex max-w-60 items-center gap-2">
                          <span className="truncate text-[13px] font-medium">
                            {index + 1}. {ticket.name}
                          </span>
                          <GradeMarker grade={ticket.updated_grade ?? ticket.grade} />
                        </div>
                        <span className="text-[11px] text-muted-foreground/70 truncate max-w-60">
                          {ticket.email || "—"}
                        </span>
                        {ticket.phone && (
                          <span className="text-[11px] text-muted-foreground/50 truncate max-w-60">
                            {ticket.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-[12px] text-muted-foreground tabular-nums">
                      {formatDate(ticket.date)}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-medium tabular-nums text-[13px]">
                      {formatZloty(grossTotal)}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-medium tabular-nums text-[13px] text-success">
                      {formatZloty(paidTotal)}
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className="rounded-md px-2 py-1 text-[12px] tabular-nums"
                      >
                        {
                          ticket.payments.filter((payment) => payment.paid_date)
                            .length
                        }/{displayedPaymentCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-center">
                      <InvoiceStatusCell ticket={ticket} />
                    </TableCell>
                    <TableCell className={cn(
                      "py-3.5 px-4 text-right tabular-nums text-[13px]",
                      taxAmount > 0 ? "text-destructive/70" : "text-muted-foreground/50"
                    )}>
                      {taxAmount > 0 ? formatZloty(taxAmount) : "0,00 zł"}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-medium tabular-nums text-[13px]">
                      {formatZloty(netTotal)}
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <StatusIndicator status={status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {(isFetching || isSaving) && (
          <div className="border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground/70 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Оновлення...
          </div>
        )}
      </div>

      {selectedTicket && (
        <PaymentsPanel
          ticket={selectedTicket}
          open={Boolean(openTicketId)}
          onClose={() => setOpenTicketId(null)}
          planError={planErrors[selectedTicket.id]}
          onCreate={(data) =>
            createPaymentMutation.mutate({
              ticketId: selectedTicket.id,
              data,
            })
          }
          onUpdate={(paymentId, paymentData) =>
            updatePaymentMutation.mutate({
              paymentId,
              data: paymentData,
            })
          }
          onDelete={(paymentId) => deletePaymentMutation.mutate(paymentId)}
          onFinanceChange={(financeData) =>
            saveFinanceMutation.mutate({
              ticketId: selectedTicket.id,
              data: financeData,
            })
          }
          onTicketChange={(ticketData) =>
            updateTicketMutation.mutate({
              ticketId: selectedTicket.id,
              data: ticketData,
            })
          }
          onPaymentPlanChange={(paymentPlan) =>
            syncPlanMutation.mutate({
              ticket: selectedTicket,
              paymentPlan,
            })
          }
        />
      )}
    </div>
  );
}
