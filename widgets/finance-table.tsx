"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidePanel } from "@/components/ui/slide-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { TicketWithFinance } from "@/shared/db/schema";
import type {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from "@/shared/db/schema.zod";
import {
  TICKET_PRICE_BY_GRADE,
  TICKET_TYPE,
  TICKET_TYPE_LIST,
} from "@/shared/const";
import { cn } from "@/shared/utils";

const SALE_SOURCE_OPTIONS = [
  { value: "site", label: "Сайт" },
  { value: "direct_transfer", label: "Переказ напряму" },
  { value: "other", label: "Інше" },
] as const;

const PAYMENT_PLAN_OPTIONS = [
  { value: "full", label: "Повна оплата" },
  { value: "two_parts", label: "Розстрочка на 2 частини" },
  { value: "three_parts", label: "Розстрочка на 3 частини" },
  { value: "custom", label: "Інша розстрочка" },
  { value: "free", label: "Безкоштовно" },
  { value: "sponsor", label: "Спонсор" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "nail_moment_company", label: "Фірма Nail Moment" },
  { value: "revolut", label: "Revolut" },
  { value: "blik", label: "BLIK" },
  { value: "cash", label: "Готівка" },
  { value: "bank_transfer", label: "Банківський переказ" },
  { value: "other", label: "Інше" },
] as const;

const INVOICE_STATUS_OPTIONS = [
  { value: "not_sent", label: "Не відправлена" },
  { value: "requested", label: "Запитана" },
  { value: "sent", label: "Відправлена" },
  { value: "not_needed", label: "Не потрібна" },
] as const;

type SaleSource = (typeof SALE_SOURCE_OPTIONS)[number]["value"];
type PaymentPlan = (typeof PAYMENT_PLAN_OPTIONS)[number]["value"];
type TicketGrade = (typeof TICKET_TYPE_LIST)[number];

const GRADE_SELECT_OPTIONS = TICKET_TYPE_LIST.map((value) => ({
  value,
  label: value,
})) as { value: TicketGrade; label: TicketGrade }[];

async function fetchTickets(): Promise<TicketWithFinance[]> {
  const response = await fetch("/api/ticket");
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

type CreateTicketInput = {
  name: string;
  email: string;
  phone: string;
  instagram?: string;
  grade: TicketGrade;
};

type CreateTicketWithFinanceInput = CreateTicketInput & {
  payment_sale_source: SaleSource;
  payment_plan: PaymentPlan;
  gross_total: string;
  discount_amount: string;
  tax_amount: string;
  nip: string;
  finance_note: string;
};

type PaymentStatusFilter = "all" | "paid" | "partial" | "overdue" | "pending";

export function FinanceTable() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
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
          invoice_status: "not_sent",
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
        <span className="text-muted-foreground">{tickets.length} записів</span>
        <span className="hidden md:inline text-border">|</span>
        <span><span className="text-muted-foreground">Сума:</span> <span className="font-semibold tabular-nums">{formatZloty(financeTotals.gross)}</span></span>
        <span><span className="text-muted-foreground">Оплачено:</span> <span className="font-semibold tabular-nums text-success">{formatZloty(financeTotals.paid)}</span></span>
        <span><span className="text-muted-foreground">Залишок:</span> <span className="font-semibold tabular-nums">{formatZloty(financeTotals.remaining)}</span></span>
        {financeTotals.overdue > 0 && (
          <span><span className="text-muted-foreground">Прострочено:</span> <span className="font-semibold tabular-nums text-destructive">{financeTotals.overdue}</span></span>
        )}
      </div>

      {isError && (
        <p className="text-destructive font-medium">
          Помилка завантаження фінансів
        </p>
      )}

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
          <Table className="w-full min-w-225">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-65">
                  Клієнт
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-17.5">
                  Тариф
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-25">
                  Повна оплата
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-25">
                  Оплачено
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">
                  Платежі
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-20">
                  Податок
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-25">
                  Чиста сума
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-22.5">
                  Статус
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {query || statusFilter !== "all" ? "Записів не знайдено" : "Немає фінансових записів"}
                  </TableCell>
                </TableRow>
              )}
              {tickets.map((ticket) => {
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
                        <span className="font-medium text-[13px] truncate max-w-60">{ticket.name}</span>
                        <span className="text-[11px] text-muted-foreground/70 truncate max-w-60">
                          {ticket.email || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <GradeMarker grade={ticket.updated_grade ?? ticket.grade} />
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

function NewTicketFinanceDialog({
  isPending,
  onCreate,
}: {
  isPending: boolean;
  onCreate: (data: CreateTicketWithFinanceInput) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTicketWithFinanceInput>(() =>
    createNewTicketFinanceDefaults()
  );
  const [error, setError] = useState<string | null>(null);

  const updateForm = (patch: Partial<CreateTicketWithFinanceInput>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleGradeChange = (grade: TicketGrade) => {
    const isZeroPaymentPlan = getExpectedPaymentCount(form.payment_plan) === 0;

    updateForm({
      grade,
      gross_total: isZeroPaymentPlan ? "0.00" : TICKET_PRICE_BY_GRADE[grade],
    });
  };

  const handlePaymentPlanChange = (payment_plan: PaymentPlan) => {
    const isZeroPaymentPlan = getExpectedPaymentCount(payment_plan) === 0;
    const wasZeroPaymentPlan = getExpectedPaymentCount(form.payment_plan) === 0;

    updateForm({
      payment_plan,
      ...(isZeroPaymentPlan
        ? {
            gross_total: "0.00",
            discount_amount: "0.00",
            tax_amount: "0.00",
          }
        : wasZeroPaymentPlan
          ? {
              gross_total: TICKET_PRICE_BY_GRADE[form.grade],
              discount_amount: "0.00",
              tax_amount: "0.00",
            }
          : {}),
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setForm(createNewTicketFinanceDefaults());
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const isZeroPaymentPlan = getExpectedPaymentCount(form.payment_plan) === 0;

      await onCreate({
        ...form,
        gross_total: isZeroPaymentPlan ? "0.00" : normalizeMoney(form.gross_total),
        discount_amount: isZeroPaymentPlan
          ? "0.00"
          : normalizeMoney(form.discount_amount),
        tax_amount: isZeroPaymentPlan ? "0.00" : normalizeMoney(form.tax_amount),
      });
      setOpen(false);
      setForm(createNewTicketFinanceDefaults());
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не вдалося створити квиток."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Додати квиток
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Новий квиток</DialogTitle>
          <DialogDescription>
            Створення квитка, фінансів і першого плану платежів.
          </DialogDescription>
        </DialogHeader>

        <form
          id="new-finance-ticket-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <PaymentField label="Ім'я">
              <Input
                required
                value={form.name}
                onChange={(event) => updateForm({ name: event.target.value })}
              />
            </PaymentField>
            <PaymentField label="Email">
              <Input
                required
                type="email"
                value={form.email}
                onChange={(event) => updateForm({ email: event.target.value })}
              />
            </PaymentField>
            <PaymentField label="Телефон">
              <Input
                required
                value={form.phone}
                onChange={(event) => updateForm({ phone: event.target.value })}
              />
            </PaymentField>
            <PaymentField label="Instagram">
              <Input
                value={form.instagram ?? ""}
                onChange={(event) =>
                  updateForm({ instagram: event.target.value })
                }
              />
            </PaymentField>
            <PaymentField label="Тариф">
              <SmallSelect
                value={form.grade}
                options={GRADE_SELECT_OPTIONS}
                onChange={handleGradeChange}
              />
            </PaymentField>
            <PaymentField label="Де продаж платежу?">
              <SmallSelect
                value={form.payment_sale_source}
                options={SALE_SOURCE_OPTIONS}
                onChange={(payment_sale_source) =>
                  updateForm({ payment_sale_source })
                }
              />
            </PaymentField>
            <PaymentField label="Оплата / розстрочка">
              <SmallSelect
                value={form.payment_plan}
                options={PAYMENT_PLAN_OPTIONS}
                onChange={handlePaymentPlanChange}
              />
            </PaymentField>
            <PaymentField label="Повна оплата">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.gross_total}
                onChange={(event) =>
                  updateForm({ gross_total: event.target.value })
                }
                onBlur={() =>
                  updateForm({ gross_total: normalizeMoney(form.gross_total) })
                }
              />
            </PaymentField>
            <PaymentField label="Знижка">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_amount}
                onChange={(event) =>
                  updateForm({ discount_amount: event.target.value })
                }
                onBlur={() =>
                  updateForm({
                    discount_amount: normalizeMoney(form.discount_amount),
                  })
                }
              />
            </PaymentField>
            <PaymentField label="Податок">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.tax_amount}
                onChange={(event) =>
                  updateForm({ tax_amount: event.target.value })
                }
                onBlur={() =>
                  updateForm({ tax_amount: normalizeMoney(form.tax_amount) })
                }
              />
            </PaymentField>
            <PaymentField label="Чиста сума">
              <ReadOnlyMoney
                value={Math.max(
                  toMoneyNumber(form.gross_total) - toMoneyNumber(form.tax_amount),
                  0
                ).toFixed(2)}
              />
            </PaymentField>
            <PaymentField label="NIP">
              <Input
                value={form.nip}
                onChange={(event) => updateForm({ nip: event.target.value })}
              />
            </PaymentField>
            <PaymentField label="Коментар" className="col-span-2">
              <Textarea
                value={form.finance_note}
                onChange={(event) =>
                  updateForm({ finance_note: event.target.value })
                }
              />
            </PaymentField>
          </div>
        </form>

        {error && (
          <div className="border-t border-border/60 px-5 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="border-t border-border/60 bg-[#f8fafc] px-5 py-3">
          <Button type="submit" form="new-finance-ticket-form" disabled={isPending}>
            {isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentsPanel({
  ticket,
  open,
  onClose,
  planError,
  onCreate,
  onUpdate,
  onDelete,
  onFinanceChange,
  onTicketChange,
  onPaymentPlanChange,
}: {
  ticket: TicketWithFinance;
  open: boolean;
  onClose: () => void;
  planError?: string;
  onCreate: (data: InsertPaymentInstallmentInput) => void;
  onUpdate: (paymentId: string, data: PatchPaymentInstallmentInput) => void;
  onDelete: (paymentId: string) => void;
  onFinanceChange: (data: UpsertTicketFinanceInput) => void;
  onTicketChange: (
    data: Partial<CreateTicketInput> & {
      updated_grade?: string | null;
      comment?: string;
    }
  ) => void;
  onPaymentPlanChange: (paymentPlan: PaymentPlan) => void;
}) {
  const sortedPayments = [...ticket.payments].sort(
    (a, b) => a.installment_number - b.installment_number
  );
  const paidCount = sortedPayments.filter((payment) => payment.paid_date).length;
  const paidTotal = sortedPayments.reduce(
    (total, payment) =>
      payment.paid_date ? total + toMoneyNumber(payment.amount) : total,
    0
  );
  const unpaidScheduledTotal = sortedPayments.reduce(
    (total, payment) =>
      payment.paid_date ? total : total + toMoneyNumber(payment.amount),
    0
  );
  const unscheduledRemaining = Math.max(
    toMoneyNumber(ticket.finance?.gross_total) - paidTotal - unpaidScheduledTotal,
    0
  );
  const hasUnscheduledRemaining = unscheduledRemaining >= 0.01;
  const selectedPaymentPlan = ticket.finance?.payment_plan ?? "full";
  const hasZeroPaymentPlan = isZeroPaymentPlan(selectedPaymentPlan);
  const planPaymentLimit = getExpectedPaymentCount(selectedPaymentPlan);
  const displayedPaymentCount = getDisplayedPaymentCount(ticket);
  const canAddPayment =
    planPaymentLimit === null || sortedPayments.length < planPaymentLimit;
  const disabledPaymentPlans = new Set(
    PAYMENT_PLAN_OPTIONS.filter((option) => {
      const optionPaymentCount = getExpectedPaymentCount(option.value);
      return optionPaymentCount !== null && optionPaymentCount < paidCount;
    }).map((option) => option.value)
  );
  const nextPaymentNumber =
    sortedPayments.at(-1)?.installment_number ?? sortedPayments.length;

  const handleGradeChange = (grade: TicketGrade) => {
    onTicketChange({
      updated_grade: grade === ticket.grade ? null : grade,
    });
    onFinanceChange(
      buildFinancePatchWithNet(ticket, {
        gross_total: hasZeroPaymentPlan ? "0.00" : TICKET_PRICE_BY_GRADE[grade],
      })
    );
  };

  const handleAddPayment = () => {
    if (!canAddPayment) return;

    const installmentNumber = nextPaymentNumber + 1;
    onCreate({
      installment_number: installmentNumber,
      amount: hasUnscheduledRemaining
        ? unscheduledRemaining.toFixed(2)
        : suggestedPaymentAmount(ticket, installmentNumber),
      sale_source: "direct_transfer",
      due_date: "",
      paid_date: "",
      payment_method: "other",
      invoice_status: "not_sent",
      invoice_number: "",
      comment: "",
    });
  };

  const footerContent = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] text-muted-foreground">
        Зміни зберігаються автоматично
      </span>
      {canAddPayment && (
        <Button type="button" size="sm" onClick={handleAddPayment}>
          <Plus data-icon="inline-start" />
          Додати платіж
        </Button>
      )}
    </div>
  );

  return (
    <SlidePanel open={open} onClose={onClose} footer={footerContent}>
      {/* Header */}
      <div className="pt-4 pb-4 border-b border-border/40 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-heading-1 truncate">{ticket.name}</h2>
            <p className="text-caption mt-1 truncate">
              {ticket.email} · {ticket.updated_grade ?? ticket.grade}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-md px-2.5 py-1.5 text-[14px] tabular-nums shrink-0"
          >
            {paidCount}/{displayedPaymentCount}
          </Badge>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-4 text-[12px] mb-6">
        <div>
          <span className="text-muted-foreground">Повна: </span>
          <span className="font-medium tabular-nums">
            {formatZloty(toMoneyNumber(ticket.finance_summary.gross_total))}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Оплачено: </span>
          <span className="font-medium tabular-nums text-success">
            {formatZloty(toMoneyNumber(ticket.finance_summary.paid_total))}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Залишок: </span>
          <span className="font-medium tabular-nums">
            {formatZloty(toMoneyNumber(ticket.finance_summary.remaining_total))}
          </span>
        </div>
      </div>

      {/* Contact info section */}
      <div className="space-y-4 mb-6">
        <h3 className="text-label-caps">Контактна інформація</h3>
        <div className="grid grid-cols-2 gap-3">
          <PaymentField label="Ім'я">
            <TextCell
              value={ticket.name}
              onSave={(name) => onTicketChange({ name })}
            />
          </PaymentField>
          <PaymentField label="Телефон">
            <TextCell
              value={ticket.phone ?? ""}
              onSave={(phone) => onTicketChange({ phone })}
            />
          </PaymentField>
          <PaymentField label="Email">
            <TextCell
              value={ticket.email}
              onSave={(email) => onTicketChange({ email })}
            />
          </PaymentField>
          <PaymentField label="Instagram">
            <TextCell
              value={ticket.instagram ?? ""}
              onSave={(instagram) => onTicketChange({ instagram })}
            />
          </PaymentField>
        </div>
      </div>

      {/* Finance details section */}
      <div className="space-y-4 mb-6">
        <h3 className="text-label-caps">Фінансові деталі</h3>
        <div className="grid grid-cols-2 gap-3">
          <PaymentField label="Тариф">
            <SmallSelect
              value={(ticket.updated_grade ?? ticket.grade) as TicketGrade}
              options={GRADE_SELECT_OPTIONS}
              onChange={handleGradeChange}
            />
          </PaymentField>
          <PaymentField label="Оплата / розстрочка">
            <SmallSelect
              value={selectedPaymentPlan}
              options={PAYMENT_PLAN_OPTIONS}
              disabledValues={disabledPaymentPlans}
              onChange={onPaymentPlanChange}
            />
            {planError && (
              <span className="block text-[11px] text-destructive mt-1">
                {planError}
              </span>
            )}
          </PaymentField>
          <PaymentField label="Повна оплата">
            <MoneyCell
              value={hasZeroPaymentPlan ? "0.00" : ticket.finance?.gross_total ?? "0.00"}
              disabled={hasZeroPaymentPlan}
              onSave={(gross_total) =>
                onFinanceChange(buildFinancePatchWithNet(ticket, { gross_total }))
              }
            />
          </PaymentField>
          <PaymentField label="Податок">
            <MoneyCell
              value={hasZeroPaymentPlan ? "0.00" : ticket.finance?.tax_amount ?? "0.00"}
              disabled={hasZeroPaymentPlan}
              onSave={(tax_amount) =>
                onFinanceChange(buildFinancePatchWithNet(ticket, { tax_amount }))
              }
            />
          </PaymentField>
          <PaymentField label="Знижка">
            <MoneyCell
              value={hasZeroPaymentPlan ? "0.00" : ticket.finance?.discount_amount ?? "0.00"}
              disabled={hasZeroPaymentPlan}
              onSave={(discount_amount) => onFinanceChange({ discount_amount })}
            />
          </PaymentField>
          <PaymentField label="Чиста сума">
            <ReadOnlyMoney value={calculatedNetTotal(ticket)} />
          </PaymentField>
          <PaymentField label="NIP">
            <TextCell
              value={ticket.finance?.nip ?? ""}
              onSave={(nip) => onFinanceChange({ nip })}
            />
          </PaymentField>
          <PaymentField label="Дата">
            <Input
              readOnly
              tabIndex={-1}
              value={formatDate(ticket.date)}
              className="h-9 border-transparent bg-muted/30 px-2 text-base shadow-none"
            />
          </PaymentField>
        </div>
        <PaymentField label="Коментар">
          <TextCell
            value={ticket.finance?.finance_note ?? ""}
            onSave={(finance_note) => onFinanceChange({ finance_note })}
          />
        </PaymentField>
      </div>

      {/* Payments section */}
      <div className="space-y-4">
        <h3 className="text-label-caps">Платежі</h3>
        <div className="flex flex-col gap-3">
          {sortedPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              isStripePayment={isStripeOriginPayment(ticket, payment)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}

          {sortedPayments.length === 0 && (
            <Empty className="border rounded-lg">
              <EmptyHeader>
                <EmptyTitle className="text-[13px]">Платежів ще немає</EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Додайте платіж, коли для цього плану є доступна частина.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </SlidePanel>
  );
}

function PaymentCard({
  payment,
  isStripePayment,
  onUpdate,
  onDelete,
}: {
  payment: TicketWithFinance["payments"][number];
  isStripePayment: boolean;
  onUpdate: (paymentId: string, data: PatchPaymentInstallmentInput) => void;
  onDelete: (paymentId: string) => void;
}) {
  const isPaid = Boolean(payment.paid_date);
  const isLocked = isStripePayment;
  const canDelete = !isPaid && !isStripePayment;
  const statusText = isStripePayment
    ? "Оплата Stripe"
    : isPaid
      ? "Оплачено"
      : "Очікує оплату";

  return (
    <Card
      className={cn(
        "rounded-lg shadow-xs",
        isLocked && "bg-muted/20"
      )}
    >
      <CardHeader className="flex-row items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-[13px]">
            #{payment.installment_number}
          </Badge>
          <div>
            <CardTitle className="text-[13px] font-medium">
              {formatZloty(toMoneyNumber(payment.amount))}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {statusText}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] font-medium">
            Оплачено
            <Switch
              checked={isPaid}
              disabled={isLocked}
              onCheckedChange={(checked) =>
                onUpdate(payment.id, {
                  paid_date: checked ? payment.paid_date ?? todayInputValue() : "",
                })
              }
            />
          </label>
          <DeletePaymentButton
            canDelete={canDelete}
            isPaid={isPaid}
            isStripePayment={isStripePayment}
            onConfirm={() => onDelete(payment.id)}
          />
        </div>
      </CardHeader>

      <Separator />
      <CardContent className="grid grid-cols-1 gap-3 p-4">
        <PaymentField label="Сума">
          <MoneyCell
            value={payment.amount}
            disabled={isLocked}
            onSave={(amount) => onUpdate(payment.id, { amount })}
          />
        </PaymentField>
        <PaymentField label="Дата оплати">
          <DateCell
            value={dateInputValue(payment.paid_date)}
            disabled={isLocked}
            onSave={(paid_date) => onUpdate(payment.id, { paid_date })}
          />
        </PaymentField>
        <PaymentField label="Термін оплати">
          <DateCell
            value={dateInputValue(payment.due_date)}
            disabled={isLocked}
            onSave={(due_date) => onUpdate(payment.id, { due_date })}
          />
        </PaymentField>
        <PaymentField label="Де продаж?">
          <SmallSelect
            value={isStripePayment ? "site" : payment.sale_source}
            options={SALE_SOURCE_OPTIONS}
            disabled={isLocked}
            onChange={(sale_source) => onUpdate(payment.id, { sale_source })}
          />
        </PaymentField>
        <PaymentField label="Варіант оплати">
          <SmallSelect
            value={payment.payment_method}
            options={PAYMENT_METHOD_OPTIONS}
            disabled={isLocked}
            onChange={(payment_method) =>
              onUpdate(payment.id, { payment_method })
            }
          />
        </PaymentField>
        <PaymentField label="Фактура">
          <SmallSelect
            value={payment.invoice_status}
            options={INVOICE_STATUS_OPTIONS}
            onChange={(invoice_status) =>
              onUpdate(payment.id, { invoice_status })
            }
          />
        </PaymentField>
        <PaymentField label="№ фактури">
          <TextCell
            value={payment.invoice_number}
            onSave={(invoice_number) => onUpdate(payment.id, { invoice_number })}
          />
        </PaymentField>
        <PaymentField label="Коментар">
          <TextCell
            value={payment.comment}
            disabled={isLocked}
            onSave={(comment) => onUpdate(payment.id, { comment })}
          />
        </PaymentField>
      </CardContent>
    </Card>
  );
}

function DeletePaymentButton({
  canDelete,
  isPaid,
  isStripePayment,
  onConfirm,
}: {
  canDelete: boolean;
  isPaid: boolean;
  isStripePayment: boolean;
  onConfirm: () => void;
}) {
  if (!canDelete) {
    const title = isStripePayment
      ? "Платіж Stripe не можна змінювати або видаляти"
      : isPaid
        ? "Оплачений платіж не можна видалити"
        : "Платіж не можна видалити";

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title={title}
        aria-label={title}
      >
        <Trash2 />
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Видалити платіж"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити платіж?</AlertDialogTitle>
          <AlertDialogDescription>
            Цю дію не можна скасувати. Платіж буде прибрано з фінансів квитка.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Видалити
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PaymentStatusFilter({
  value,
  onChange,
}: {
  value: PaymentStatusFilter;
  onChange: (value: PaymentStatusFilter) => void;
}) {
  const options: { value: PaymentStatusFilter; label: string }[] = [
    { value: "all", label: "Всі" },
    { value: "paid", label: "Оплачені" },
    { value: "partial", label: "Часткові" },
    { value: "pending", label: "Очікують" },
    { value: "overdue", label: "Прострочені" },
  ];

  return (
    <div className="flex items-center gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors",
            value === option.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StatusIndicator({ status }: { status?: string | null }) {
  const config: Record<string, { color: string; label: string }> = {
    paid: { color: "bg-success", label: "Оплачено" },
    partial: { color: "bg-warning", label: "Частково" },
    overdue: { color: "bg-destructive", label: "Прострочено" },
    unpaid: { color: "bg-muted-foreground/30", label: "Очікує" },
    untracked: { color: "bg-muted-foreground/20", label: "Без оплат" },
    pending: { color: "bg-muted-foreground/30", label: "Очікує" },
    not_started: { color: "bg-muted-foreground/30", label: "Очікує" },
  };

  const statusConfig = config[status ?? ""] ?? { color: "bg-muted-foreground/20", label: "—" };

  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full shrink-0", statusConfig.color)} />
      <span className="text-[12px] text-muted-foreground">{statusConfig.label}</span>
    </div>
  );
}

function GradeMarker({ grade }: { grade?: string | null }) {
  const normalizedGrade = grade?.toLowerCase();

  if (normalizedGrade === TICKET_TYPE.VIP) {
    return (
      <Badge variant="default" className="rounded px-1.5 py-0.5 text-[9px] uppercase font-semibold">
        vip
      </Badge>
    );
  }

  if (normalizedGrade === TICKET_TYPE.MAXI) {
    return (
      <Badge variant="warning" className="rounded px-1.5 py-0.5 text-[9px] uppercase font-semibold">
        maxi
      </Badge>
    );
  }

  if (normalizedGrade === TICKET_TYPE.STANDARD) {
    return (
      <span className="text-[11px] text-muted-foreground uppercase font-medium">std</span>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

function PaymentField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Field className={className}>
      <FieldLabel className="text-[11px] text-muted-foreground">
        {label}
      </FieldLabel>
      {children}
    </Field>
  );
}

function ReadOnlyMoney({ value }: { value?: string | null }) {
  return (
    <Input
      readOnly
      tabIndex={-1}
      value={normalizeMoney(value ?? "0.00")}
      className="h-9 border-transparent bg-muted/30 px-2 text-right text-base tabular-nums shadow-none"
    />
  );
}
function MoneyCell({
  value,
  placeholder = "0.00",
  disabled = false,
  onSave,
}: {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  return (
    <Input
      key={value}
      type="number"
      step="0.01"
      min="0"
      defaultValue={value}
      disabled={disabled}
      placeholder={placeholder}
      onBlur={(event) => {
        const nextValue = normalizeMoney(event.target.value);
        if (nextValue !== value) onSave(nextValue);
      }}
      className="border-transparent bg-white/40 px-1.5 text-right tabular-nums shadow-none hover:border-border/60 hover:bg-white"
    />
  );
}

function TextCell({
  value,
  disabled = false,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  return (
    <Input
      key={value}
      type="text"
      defaultValue={value}
      disabled={disabled}
      onBlur={(event) => {
        const nextValue = event.target.value.trim();
        if (nextValue !== value) onSave(nextValue);
      }}
      className="border-transparent bg-white/40 px-1.5 shadow-none hover:border-border/60 hover:bg-white"
    />
  );
}

function DateCell({
  value,
  disabled = false,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between bg-white/40 px-2 text-base font-normal shadow-none",
            !value && "text-muted-foreground"
          )}
        >
          <span>{value ? formatDate(value) : "mm/dd/yyyy"}</span>
          <CalendarIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onSave(toDateInputValue(date));
          }}
        />
        {value && (
          <div className="border-t border-border/60 p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onSave("")}
            >
              Очистити
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SmallSelect<TOption extends readonly { value: string; label: string }[]>({
  value,
  options,
  disabled = false,
  disabledValues,
  onChange,
}: {
  value: TOption[number]["value"];
  options: TOption;
  disabled?: boolean;
  disabledValues?: ReadonlySet<string>;
  onChange: (value: TOption[number]["value"]) => void;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) =>
        onChange(nextValue as TOption[number]["value"])
      }
    >
      <SelectTrigger
        className="h-9 w-full rounded-md bg-background text-base"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={disabledValues?.has(option.value)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

async function saveFinance(
  ticketId: string,
  data: UpsertTicketFinanceInput
): Promise<unknown> {
  const response = await fetch(`/api/ticket/${ticketId}/finance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function createTicket(body: CreateTicketInput): Promise<{ ticket: { id: string } }> {
  const response = await fetch("/api/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.message || response.statusText);
  }
  return json;
}

async function patchTicket(
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
    throw new Error(json?.message || response.statusText);
  }
  return json;
}

async function createTicketWithFinance(
  data: CreateTicketWithFinanceInput
): Promise<unknown> {
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
        invoice_status: "not_sent",
        invoice_number: "",
        comment: "",
      });
    }
  }

  return ticket;
}

async function createPayment(
  ticketId: string,
  data: InsertPaymentInstallmentInput
): Promise<unknown> {
  const response = await fetch(`/api/ticket/${ticketId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function updatePayment(
  paymentId: string,
  data: PatchPaymentInstallmentInput
): Promise<unknown> {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function deletePayment(paymentId: string): Promise<unknown> {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function isStripeOriginPayment(
  ticket: TicketWithFinance,
  payment: TicketWithFinance["payments"][number]
): boolean {
  return (
    !ticket.stripe_event_id.startsWith("manual") &&
    payment.installment_number === 1
  );
}

function createNewTicketFinanceDefaults(): CreateTicketWithFinanceInput {
  return {
    name: "",
    email: "",
    phone: "",
    instagram: "",
    grade: "standard",
    payment_sale_source: "direct_transfer",
    payment_plan: "full",
    gross_total: TICKET_PRICE_BY_GRADE.standard,
    discount_amount: "0.00",
    tax_amount: "0.00",
    nip: "",
    finance_note: "",
  };
}

function getExpectedPaymentCount(plan: PaymentPlan): number | null {
  if (plan === "full") return 1;
  if (plan === "two_parts") return 2;
  if (plan === "three_parts") return 3;
  if (plan === "free" || plan === "sponsor") return 0;
  return null;
}

function isZeroPaymentPlan(plan: string | null | undefined): boolean {
  return plan === "free" || plan === "sponsor";
}

function getDisplayedPaymentCount(ticket: TicketWithFinance): number {
  const paymentLimit = getExpectedPaymentCount(ticket.finance?.payment_plan ?? "full");
  return paymentLimit ?? Math.max(ticket.payments.length, 1);
}

function suggestedPaymentAmount(
  ticket: TicketWithFinance,
  paymentNumber: number
): string {
  const expectedPaymentCount = getExpectedPaymentCount(
    ticket.finance?.payment_plan ?? "full"
  );
  const splitCount = expectedPaymentCount || Math.max(paymentNumber, 1);
  return splitMoney(ticket.finance?.gross_total ?? "0.00", splitCount)[
    paymentNumber - 1
  ] ?? "0.00";
}

function splitMoney(value: string, count: number): string[] {
  if (count <= 0) return [];

  const totalCents = Math.max(Math.round(Number(value || 0) * 100), 0);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainderCents ? 1 : 0);
    return (cents / 100).toFixed(2);
  });
}

function normalizeMoney(value: string): string {
  if (!value) return "0.00";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

function calculatedNetTotal(ticket: TicketWithFinance): string {
  if (isZeroPaymentPlan(ticket.finance?.payment_plan)) return "0.00";

  const grossTotal = toMoneyNumber(ticket.finance?.gross_total);
  const taxAmount = toMoneyNumber(ticket.finance?.tax_amount);
  return Math.max(grossTotal - taxAmount, 0).toFixed(2);
}

function buildFinancePatchWithNet(
  ticket: TicketWithFinance,
  patch: UpsertTicketFinanceInput
): UpsertTicketFinanceInput {
  const grossTotal = patch.gross_total ?? ticket.finance?.gross_total ?? "0.00";
  const taxAmount = patch.tax_amount ?? ticket.finance?.tax_amount ?? "0.00";
  const netTotal = Math.max(
    toMoneyNumber(grossTotal) - toMoneyNumber(taxAmount),
    0
  ).toFixed(2);

  return {
    ...patch,
    net_total: netTotal,
  };
}

function toMoneyNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatZloty(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value);
}

function dateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
