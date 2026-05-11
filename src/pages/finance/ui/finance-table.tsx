'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Search } from 'lucide-react';
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
import {
  calculateTicketPaymentCoverage,
  type TicketWithFinance,
} from '@/entities/ticket';
import { cn } from '@/shared/lib/cn';
import {
  createTicketWithFinance,
  fetchTickets,
} from '../api/client';
import type { PaymentStatusFilter as PaymentStatusFilterValue } from '../model/types';
import { buildDiscountOptions } from '../model/discount-options';
import { ticketsQueryKey } from '../model/finance-cache';
import { useFinanceAutosave } from '../model/use-finance-autosave';
import {
  calculatedNetTotal,
  formatDate,
  formatZloty,
  getDisplayedPaymentCount,
  isZeroPaymentPlan,
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

const discountOptionsQueryKey = ["finance", "discount-options", "percent-notes"] as const;

function getFinanceAttributionSummary(
  attribution: TicketWithFinance["attribution"]
) {
  if (!attribution) return null;

  return (
    [attribution.utm_source, attribution.utm_campaign]
      .filter((part): part is string => Boolean(part))
      .join(" / ") ||
    attribution.utm_medium ||
    attribution.utm_content ||
    attribution.utm_term ||
    null
  );
}

function getFinanceAttributionTitle(
  attribution: TicketWithFinance["attribution"]
) {
  if (!attribution) return "";

  return [
    ["UTM source", attribution.utm_source],
    ["UTM medium", attribution.utm_medium],
    ["UTM campaign", attribution.utm_campaign],
    ["UTM content", attribution.utm_content],
    ["UTM term", attribution.utm_term],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join(" / ");
}

export function FinanceTable() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilterValue>("all");
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [pendingCloseTicketId, setPendingCloseTicketId] = useState<string | null>(
    null
  );
  const [blockedCloseTicketId, setBlockedCloseTicketId] = useState<string | null>(
    null
  );
  const financeAutosave = useFinanceAutosave();
  const { data, isLoading, isFetching, isError } = useQuery<
    TicketWithFinance[],
    Error
  >({
    queryKey: ticketsQueryKey,
    queryFn: fetchTickets,
    staleTime: Infinity,
  });
  const { data: stableDiscountOptions } = useQuery<string[], Error>({
    queryKey: discountOptionsQueryKey,
    queryFn: () => Promise.resolve(buildDiscountOptions(data ?? [])),
    enabled: data !== undefined,
    staleTime: Infinity,
  });

  const createTicketMutation = useMutation({
    mutationFn: createTicketWithFinance,
    onSuccess: (ticket) => {
      setOpenTicketId(ticket.id);
      queryClient.invalidateQueries({ queryKey: ticketsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
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
        ticket.attribution?.utm_source,
        ticket.attribution?.utm_campaign,
        ticket.attribution?.utm_medium,
        ticket.attribution?.utm_content,
        ticket.attribution?.utm_term,
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
  const liveDiscountOptions = useMemo(
    () => buildDiscountOptions(data ?? []),
    [data]
  );
  const discountOptions = stableDiscountOptions ?? liveDiscountOptions;

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === openTicketId) ?? null,
    [openTicketId, tickets]
  );

  const isSaving =
    financeAutosave.isSaving || createTicketMutation.isPending;

  const openTicketPayments = (ticketId: string) => {
    setBlockedCloseTicketId(null);
    setPendingCloseTicketId(null);
    setOpenTicketId(ticketId);
  };

  const requestClosePaymentsPanel = () => {
    if (!selectedTicket) {
      setOpenTicketId(null);
      return;
    }

    const saveState = financeAutosave.getTicketSaveState(selectedTicket);
    const hasShownFailedCloseWarning =
      blockedCloseTicketId === selectedTicket.id;

    if (saveState.isSaving) {
      setBlockedCloseTicketId(null);
      setPendingCloseTicketId(selectedTicket.id);
      return;
    }

    if (saveState.hasError && !hasShownFailedCloseWarning) {
      setBlockedCloseTicketId(selectedTicket.id);
      return;
    }

    setBlockedCloseTicketId(null);
    setPendingCloseTicketId(null);
    setOpenTicketId(null);
  };

  useEffect(() => {
    if (!pendingCloseTicketId) return;

    const timeoutId = window.setTimeout(() => {
      const ticket =
        tickets.find((item) => item.id === pendingCloseTicketId) ?? null;
      if (!ticket) {
        setPendingCloseTicketId(null);
        return;
      }

      const saveState = financeAutosave.getTicketSaveState(ticket);
      if (saveState.isSaving) return;

      setPendingCloseTicketId(null);

      if (saveState.hasError) {
        setBlockedCloseTicketId(ticket.id);
        return;
      }

      setBlockedCloseTicketId(null);
      setOpenTicketId((current) => (current === ticket.id ? null : current));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [financeAutosave, pendingCloseTicketId, tickets]);

  useEffect(() => {
    if (!blockedCloseTicketId) return;

    const timeoutId = window.setTimeout(() => {
      const ticket =
        tickets.find((item) => item.id === blockedCloseTicketId) ?? null;
      if (!ticket || openTicketId !== ticket.id) {
        setBlockedCloseTicketId(null);
        return;
      }

      if (!financeAutosave.getTicketSaveState(ticket).hasError) {
        setBlockedCloseTicketId(null);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [blockedCloseTicketId, financeAutosave, openTicketId, tickets]);

  if (isLoading) {
    return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading-1">Фінанси</h2>
        <NewTicketFinanceDialog
          discountOptions={discountOptions}
          isPending={createTicketMutation.isPending}
          onCreate={(data) => createTicketMutation.mutateAsync(data)}
        />
      </div>

      {/* Summary stats - compact inline */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <span className="text-muted-foreground">{tickets.length} квитків</span>
        <span className="hidden md:inline text-border">|</span>
        <span><span className="text-muted-foreground">Вартість:</span> <span className="font-semibold tabular-nums">{formatZloty(financeTotals.gross)}</span></span>
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
                  Вартість
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-25">
                  Оплачено
                </TableHead>
                <TableHead className="h-10 px-4 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32">
                  Платежі
                </TableHead>
                <TableHead className="h-10 px-4 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32">
                  Рахунок-фактура
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-20">
                  Комісія
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
                const paymentCoverage = calculateTicketPaymentCoverage(
                  ticket.finance,
                  ticket.payments
                );
                const hasPaymentCoverageMismatch =
                  paymentCoverage.status !== "balanced";
                const paymentCoverageDifference = Math.abs(
                  paymentCoverage.scheduledDifference
                );
                const paymentCoverageTitle = [
                  `Платежі: ${formatZloty(paymentCoverage.paidTotal)} оплачено`,
                  `${formatZloty(paymentCoverage.pendingScheduledTotal)} заплановано`,
                  paymentCoverage.status === "under_scheduled"
                    ? `${formatZloty(paymentCoverage.missingScheduledTotal)} не заплановано`
                    : null,
                  paymentCoverage.status === "over_scheduled"
                    ? `${formatZloty(paymentCoverage.overScheduledTotal)} понад вартість`
                    : null,
                  `${formatZloty(paymentCoverage.payableTotal)} вартість`,
                ]
                  .filter((part): part is string => Boolean(part))
                  .join(" / ");
                const paymentCoverageMismatchLabel =
                  paymentCoverage.status === "under_scheduled"
                    ? `Бракує ${formatZloty(paymentCoverageDifference)}`
                    : paymentCoverage.status === "over_scheduled"
                      ? `+${formatZloty(paymentCoverageDifference)}`
                      : null;
                const attributionSummary = getFinanceAttributionSummary(
                  ticket.attribution
                );
                const attributionTitle = getFinanceAttributionTitle(
                  ticket.attribution
                );

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
                        {attributionSummary && (
                          <span
                            className="mt-1 flex w-fit max-w-60 items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            title={attributionTitle}
                          >
                            <span className="text-muted-foreground/60">
                              UTM
                            </span>
                            <span className="truncate">
                              {attributionSummary}
                            </span>
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
                    <TableCell className="py-3.5 px-4 text-center">
                      <div
                        className="flex flex-col items-center gap-1"
                        title={paymentCoverageTitle}
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md px-2 py-1 text-[12px] tabular-nums",
                            hasPaymentCoverageMismatch &&
                              "border-warning/35 bg-warning/5 text-foreground"
                          )}
                        >
                          {hasPaymentCoverageMismatch && (
                            <AlertCircle className="h-3 w-3 text-warning/70" />
                          )}
                          {
                            ticket.payments.filter((payment) => payment.is_paid)
                              .length
                          }/{displayedPaymentCount}
                        </Badge>
                        {paymentCoverageMismatchLabel && (
                          <span className="whitespace-nowrap text-[11px] font-normal text-muted-foreground tabular-nums">
                            {paymentCoverageMismatchLabel}
                          </span>
                        )}
                      </div>
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
          onClose={requestClosePaymentsPanel}
          closeBlockedByError={blockedCloseTicketId === selectedTicket.id}
          closePending={pendingCloseTicketId === selectedTicket.id}
          discountOptions={discountOptions}
          paymentActionError={financeAutosave.getPaymentActionError(
            selectedTicket.id
          )}
          getFieldStatus={financeAutosave.getFieldStatus}
          onCreate={(data) =>
            financeAutosave.createPayment(selectedTicket.id, data)
          }
          onUpdate={(paymentId, paymentData, fieldKey) =>
            financeAutosave.savePayment(paymentId, paymentData, fieldKey)
          }
          onDelete={(paymentId) =>
            financeAutosave.deletePayment(selectedTicket.id, paymentId)
          }
          onFinanceChange={(financeData, fieldKey) =>
            financeAutosave.saveFinance(
              selectedTicket.id,
              financeData,
              fieldKey
            )
          }
          onTicketChange={(ticketData, fieldKey) =>
            financeAutosave.saveTicket(selectedTicket.id, ticketData, fieldKey)
          }
          onPaymentPlanChange={(paymentPlan, fieldKey) =>
            financeAutosave.savePaymentPlan(
              selectedTicket.id,
              paymentPlan,
              fieldKey
            )
          }
        />
      )}
    </div>
  );
}
