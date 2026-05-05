"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  CalendarIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import {
  TICKET_TYPE_BADGE_COLORS,
  TicketTypeBadge,
} from "@/blocks/ticket-type-badge";
import type { TicketWithFinance } from "@/shared/db/schema";
import type {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from "@/shared/db/schema.zod";
import {
  TICKET_PRICE_BY_GRADE,
  TICKET_TYPE_LIST,
} from "@/shared/const";
import { cn } from "@/shared/utils";

const SALE_SOURCE_OPTIONS = [
  { value: "site", label: "Сайт" },
  { value: "direct_transfer", label: "Прямий переказ" },
  { value: "other", label: "Інше" },
] as const;

const PAYMENT_PLAN_OPTIONS = [
  { value: "full", label: "Повна оплата" },
  { value: "two_parts", label: "Розстрочка на 2 частини" },
  { value: "three_parts", label: "Розстрочка на 3 частини" },
  { value: "custom", label: "Індивідуальний графік" },
  { value: "free", label: "Без оплати" },
  { value: "sponsor", label: "Спонсорський квиток" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "nail_moment_company", label: "Рахунок Nail Moment" },
  { value: "revolut", label: "Revolut" },
  { value: "blik", label: "BLIK" },
  { value: "cash", label: "Готівка" },
  { value: "bank_transfer", label: "Банківський переказ" },
  { value: "other", label: "Інше" },
] as const;

const INVOICE_STATUS_OPTIONS = [
  { value: "not_needed", label: "Не запитана" },
  { value: "requested", label: "Запитана" },
  { value: "sent", label: "Надіслана" },
] as const;

type SaleSource = (typeof SALE_SOURCE_OPTIONS)[number]["value"];
type PaymentPlan = (typeof PAYMENT_PLAN_OPTIONS)[number]["value"];
type TicketGrade = (typeof TICKET_TYPE_LIST)[number];

const GRADE_SELECT_OPTIONS = TICKET_TYPE_LIST.map((value) => ({
  value,
  label: value,
})) as { value: TicketGrade; label: TicketGrade }[];

const saleSourceValues = SALE_SOURCE_OPTIONS.map((option) => option.value) as [
  SaleSource,
  ...SaleSource[],
];
const paymentPlanValues = PAYMENT_PLAN_OPTIONS.map((option) => option.value) as [
  PaymentPlan,
  ...PaymentPlan[],
];

const moneyFormSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || Number.isFinite(parseMoneyNumber(value)), {
    message: "Введіть коректну суму",
  })
  .refine((value) => parseMoneyNumber(value || 0) >= 0, {
    message: "Сума не може бути від’ємною",
  });

const newTicketFinanceSchema = z
  .object({
    name: z.string().trim().min(1, "Ім’я обов’язкове"),
    email: z
      .string()
      .trim()
      .min(1, "Email обов’язковий")
      .email("Невалідна адреса"),
    phone: z
      .string()
      .trim()
      .min(9, "Телефон має містити щонайменше 9 символів"),
    instagram: z.string().trim().optional(),
    grade: z.enum(TICKET_TYPE_LIST as [TicketGrade, ...TicketGrade[]]),
    payment_sale_source: z.enum(saleSourceValues),
    payment_plan: z.enum(paymentPlanValues),
    gross_total: moneyFormSchema,
    discount_amount: moneyFormSchema,
    tax_amount: moneyFormSchema,
    nip: z.string().trim(),
    finance_note: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (getExpectedPaymentCount(value.payment_plan) === 0) return;

    const grossTotal = toMoneyNumber(value.gross_total);
    const taxAmount = toMoneyNumber(value.tax_amount);
    const discountAmount = toMoneyNumber(value.discount_amount);

    if (grossTotal <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Сума до оплати має бути більшою за 0",
        path: ["gross_total"],
      });
    }

    if (taxAmount > grossTotal) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Податок не може бути більшим за суму до оплати",
        path: ["tax_amount"],
      });
    }

    if (discountAmount > grossTotal) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Знижка не може бути більшою за суму до оплати",
        path: ["discount_amount"],
      });
    }
  });

async function fetchTickets(): Promise<TicketWithFinance[]> {
  const response = await fetch("/api/ticket");
  if (!response.ok) throw await readApiError(response);
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

type CreatedFinanceTicket = {
  id: string;
};

type CreateTicketField = keyof CreateTicketWithFinanceInput;
type FieldErrors<TField extends string = string> = Partial<Record<TField, string>>;

type ApiIssue = {
  message?: string;
  path?: Array<string | number>;
};

class ApiError extends Error {
  fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

type PaymentStatusFilter = "all" | "paid" | "partial" | "overdue" | "pending";
type InvoiceStatus = (typeof INVOICE_STATUS_OPTIONS)[number]["value"];
type InvoiceCounts = Record<InvoiceStatus, number> & {
  total: number;
};

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

type FinanceChartData = ReturnType<typeof buildFinanceCharts>;

const gradeRevenueChartConfig = {
  standard: {
    label: "Standard",
    color: TICKET_TYPE_BADGE_COLORS.standard.border,
  },
  maxi: {
    label: "Maxi",
    color: TICKET_TYPE_BADGE_COLORS.maxi.border,
  },
  vip: {
    label: "VIP",
    color: TICKET_TYPE_BADGE_COLORS.vip.background,
  },
} satisfies ChartConfig;

const saleSourceChartConfig = {
  amount: {
    label: "Сума",
  },
  site: {
    label: "Сайт",
    color: "var(--chart-1)",
  },
  direct_transfer: {
    label: "Прямий переказ",
    color: "var(--chart-2)",
  },
  other: {
    label: "Інше",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const paymentStatusChartConfig = {
  count: {
    label: "Квитки",
  },
  paid: {
    label: "Оплачено",
    color: "var(--success)",
  },
  partial: {
    label: "Часткова оплата",
    color: "var(--warning)",
  },
  unpaid: {
    label: "Очікують оплату",
    color: "var(--muted-foreground)",
  },
  overdue: {
    label: "Прострочені",
    color: "var(--destructive)",
  },
  untracked: {
    label: "Без платежів",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

const cashflowChartConfig = {
  paid: {
    label: "Надійшло",
    color: "var(--success)",
  },
  expected: {
    label: "Заплановано",
    color: "var(--warning)",
  },
} satisfies ChartConfig;

function FinanceCharts({ data }: { data: FinanceChartData }) {
  const gradeTotals = chartGradeOrder.map((grade) => ({
    key: grade,
    label: grade.toUpperCase(),
    value: data.gradeTimeline.reduce((sum, item) => sum + item[grade], 0),
    color: chartGradeFill[grade],
  }));
  const gradeTotal = gradeTotals.reduce((sum, item) => sum + item.value, 0);
  const sourceTotal = data.saleSources.reduce(
    (sum, source) => sum + source.amount,
    0
  );
  const statusTotal = data.paymentStatuses.reduce(
    (sum, status) => sum + status.count,
    0
  );
  const cashflowStats = [
    {
      key: "paid",
      label: "Надійшло",
      value: data.cashflow.reduce((sum, item) => sum + item.paid, 0),
      color: "var(--success)",
    },
    {
      key: "expected",
      label: "Заплановано",
      value: data.cashflow.reduce((sum, item) => sum + item.expected, 0),
      color: "var(--warning)",
    },
  ];
  const cashflowTotal = cashflowStats.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Сума за тарифами</CardTitle>
          <CardDescription>Продажі Standard, Maxi і VIP за датами</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={gradeRevenueChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <AreaChart
              accessibilityLayer
              data={data.gradeTimeline}
              margin={{ left: 0, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={16}
              />
              <YAxis
                domain={[0, "auto"]}
                width={52}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactZloty(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    valueFormatter={formatChartZlotyTooltip}
                  />
                }
              />
              <Area
                dataKey="standard"
                type="monotone"
                stackId="tickets"
                fill="var(--color-standard)"
                fillOpacity={0.35}
                stroke="var(--color-standard)"
              />
              <Area
                dataKey="maxi"
                type="monotone"
                stackId="tickets"
                fill="var(--color-maxi)"
                fillOpacity={0.35}
                stroke="var(--color-maxi)"
              />
              <Area
                dataKey="vip"
                type="monotone"
                stackId="tickets"
                fill="var(--color-vip)"
                fillOpacity={0.35}
                stroke="var(--color-vip)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <ChartStatsList
            items={gradeTotals}
            total={gradeTotal}
            formatValue={formatZloty}
          />
        </CardFooter>
      </Card>

      <Card className="w-full">
        <CardHeader className="items-center pb-0">
          <CardTitle>Продажі за каналами</CardTitle>
          <CardDescription>Розподіл за каналами оплати</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={saleSourceChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <BarChart accessibilityLayer data={data.saleSources}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                domain={[0, "auto"]}
                width={52}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactZloty(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dashed"
                    valueFormatter={formatChartZlotyTooltip}
                  />
                }
              />
              <Bar dataKey="amount" radius={4}>
                {data.saleSources.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <ChartStatsList
            items={data.saleSources.map((source) => ({
              key: source.key,
              label: source.label,
              value: source.amount,
              detail: `${source.count} квитків`,
              color: chartSaleSourceLegendFill[source.key],
            }))}
            total={sourceTotal}
            formatValue={formatZloty}
          />
        </CardFooter>
      </Card>

      <Card className="w-full">
        <CardHeader className="items-center pb-0">
          <CardTitle>Статуси платежів</CardTitle>
          <CardDescription>Стан оплат за квитками</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={paymentStatusChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <BarChart accessibilityLayer data={data.paymentStatuses}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, "auto"]}
                width={32}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar dataKey="count" radius={4}>
                {data.paymentStatuses.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <ChartStatsList
            items={data.paymentStatuses.map((status) => ({
              key: status.key,
              label: status.label,
              value: status.count,
              color: chartPaymentStatusLegendFill[status.key],
            }))}
            total={statusTotal}
            formatValue={(value) => value.toLocaleString("uk-UA")}
          />
        </CardFooter>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Графік платежів</CardTitle>
          <CardDescription>Фактичні та заплановані надходження</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={cashflowChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <AreaChart
              accessibilityLayer
              data={data.cashflow}
              margin={{ left: 0, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={16}
              />
              <YAxis
                domain={[0, "auto"]}
                width={52}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactZloty(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    valueFormatter={formatChartZlotyTooltip}
                  />
                }
              />
              <Area
                dataKey="paid"
                type="monotone"
                fill="var(--color-paid)"
                fillOpacity={0.35}
                stroke="var(--color-paid)"
              />
              <Area
                dataKey="expected"
                type="monotone"
                fill="var(--color-expected)"
                fillOpacity={0.2}
                stroke="var(--color-expected)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <ChartStatsList
            items={cashflowStats}
            total={cashflowTotal}
            formatValue={formatZloty}
          />
        </CardFooter>
      </Card>
    </div>
  );
}

type ChartStatItem = {
  key: string;
  label: string;
  value: number;
  detail?: string;
  color: string;
};

function ChartStatsList({
  items,
  total,
  formatValue,
}: {
  items: ChartStatItem[];
  total: number;
  formatValue: (value: number) => string;
}) {
  const visibleItems = items.filter((item) => item.value > 0);

  return (
    <div className="grid w-full gap-2">
      {visibleItems.length > 0 ? (
        visibleItems.map((item) => (
          <div
            key={item.key}
            className="grid grid-cols-[1fr_auto] items-start gap-3 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0">
                <div className="truncate font-medium leading-none">
                  {item.label}
                </div>
                {item.detail && (
                  <div className="mt-1 text-xs leading-none text-muted-foreground">
                    {item.detail}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium tabular-nums leading-none">
                {formatValue(item.value)}
              </div>
              <div className="mt-1 text-xs tabular-nums leading-none text-muted-foreground">
                {formatPercent(item.value, total)}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-muted-foreground">Немає даних</div>
      )}
    </div>
  );
}

const chartGradeOrder = ["standard", "maxi", "vip"] as const;
const chartSaleSourceOrder = ["site", "direct_transfer", "other"] as const;
const chartPaymentStatusOrder = [
  "paid",
  "partial",
  "unpaid",
  "overdue",
  "untracked",
] as const;

const chartGradeFill: Record<TicketGrade, string> = {
  standard: TICKET_TYPE_BADGE_COLORS.standard.border,
  maxi: TICKET_TYPE_BADGE_COLORS.maxi.border,
  vip: TICKET_TYPE_BADGE_COLORS.vip.background,
};

const chartSaleSourceFill: Record<SaleSource, string> = {
  site: "var(--color-site)",
  direct_transfer: "var(--color-direct_transfer)",
  other: "var(--color-other)",
};

const chartSaleSourceLegendFill: Record<SaleSource, string> = {
  site: "var(--chart-1)",
  direct_transfer: "var(--chart-2)",
  other: "var(--chart-3)",
};

const chartPaymentStatusFill: Record<
  (typeof chartPaymentStatusOrder)[number],
  string
> = {
  paid: "var(--color-paid)",
  partial: "var(--color-partial)",
  unpaid: "var(--color-unpaid)",
  overdue: "var(--color-overdue)",
  untracked: "var(--color-untracked)",
};

const chartPaymentStatusLegendFill: Record<
  (typeof chartPaymentStatusOrder)[number],
  string
> = {
  paid: "var(--success)",
  partial: "var(--warning)",
  unpaid: "var(--muted-foreground)",
  overdue: "var(--destructive)",
  untracked: "var(--muted-foreground)",
};

function buildFinanceCharts(tickets: TicketWithFinance[]) {
  const gradeTimeline = new Map<
    string,
    { key: string; label: string } & Record<TicketGrade, number>
  >();
  const saleSources = new Map<
    SaleSource,
    {
      key: SaleSource;
      label: string;
      amount: number;
      count: number;
      fill: string;
    }
  >(
    chartSaleSourceOrder.map((source) => [
      source,
      {
        key: source,
        label: getSaleSourceLabel(source),
        amount: 0,
        count: 0,
        fill: chartSaleSourceFill[source],
      },
    ])
  );
  const paymentStatuses = new Map<
    (typeof chartPaymentStatusOrder)[number],
    {
      key: (typeof chartPaymentStatusOrder)[number];
      label: string;
      count: number;
      fill: string;
    }
  >(
    chartPaymentStatusOrder.map((status) => [
      status,
      {
        key: status,
        label: getPaymentStatusLabel(status),
        count: 0,
        fill: chartPaymentStatusFill[status],
      },
    ])
  );
  const cashflow = new Map<
    string,
    { key: string; label: string; paid: number; expected: number }
  >();

  for (const ticket of tickets) {
    const grossTotal = toMoneyNumber(ticket.finance_summary.gross_total);
    const grade = normalizeChartGrade(ticket.updated_grade ?? ticket.grade);
    const ticketDateKey = dateInputValue(ticket.date);
    if (ticketDateKey && grossTotal > 0) {
      const gradeBucket =
        gradeTimeline.get(ticketDateKey) ??
        {
          key: ticketDateKey,
          label: formatChartDate(ticketDateKey),
          standard: 0,
          maxi: 0,
          vip: 0,
        };

      gradeBucket[grade] += grossTotal;
      gradeTimeline.set(ticketDateKey, gradeBucket);
    }

    const saleSource = normalizeSaleSource(ticket.finance?.sale_source);
    const saleSourceBucket = saleSources.get(saleSource);
    if (saleSourceBucket) {
      saleSourceBucket.amount += grossTotal;
      saleSourceBucket.count += 1;
    }

    const status = normalizePaymentStatus(ticket.finance_summary.payment_status);
    const statusBucket = paymentStatuses.get(status);
    if (statusBucket) {
      statusBucket.count += 1;
    }

    for (const payment of ticket.payments) {
      const amount = toMoneyNumber(payment.amount);
      if (amount <= 0) continue;

      const dateKey = dateInputValue(payment.paid_date ?? payment.due_date);
      if (!dateKey) continue;

      const bucket =
        cashflow.get(dateKey) ??
        {
          key: dateKey,
          label: formatChartDate(dateKey),
          paid: 0,
          expected: 0,
        };

      if (payment.paid_date) {
        bucket.paid += amount;
      } else {
        bucket.expected += amount;
      }

      cashflow.set(dateKey, bucket);
    }
  }

  return {
    gradeTimeline: Array.from(gradeTimeline.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
    saleSources: Array.from(saleSources.values()).filter(
      (item) => item.count > 0 || item.amount > 0
    ),
    paymentStatuses: Array.from(paymentStatuses.values()).filter(
      (item) => item.count > 0
    ),
    cashflow: Array.from(cashflow.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
  };
}

function normalizeChartGrade(value: string | null | undefined): TicketGrade {
  const lowerValue = value?.toLowerCase();
  if (lowerValue === "standart") return "standard";
  if (
    lowerValue &&
    TICKET_TYPE_LIST.includes(lowerValue as TicketGrade)
  ) {
    return lowerValue as TicketGrade;
  }
  return "standard";
}

function normalizeSaleSource(value: string | null | undefined): SaleSource {
  if (chartSaleSourceOrder.includes(value as SaleSource)) {
    return value as SaleSource;
  }
  return "other";
}

function normalizePaymentStatus(
  value: string | null | undefined
): (typeof chartPaymentStatusOrder)[number] {
  if (
    chartPaymentStatusOrder.includes(
      value as (typeof chartPaymentStatusOrder)[number]
    )
  ) {
    return value as (typeof chartPaymentStatusOrder)[number];
  }
  return "untracked";
}

function getSaleSourceLabel(value: SaleSource): string {
  return SALE_SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function getPaymentStatusLabel(
  value: (typeof chartPaymentStatusOrder)[number]
): string {
  const labels: Record<(typeof chartPaymentStatusOrder)[number], string> = {
    paid: "Оплачено",
    partial: "Часткова оплата",
    unpaid: "Очікують оплату",
    overdue: "Прострочені",
    untracked: "Без платежів",
  };
  return labels[value];
}

function formatChartDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}.${month}`;
}

function NewTicketFinanceDialog({
  isPending,
  onCreate,
}: {
  isPending: boolean;
  onCreate: (data: CreateTicketWithFinanceInput) => Promise<CreatedFinanceTicket>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTicketWithFinanceInput>(() =>
    createNewTicketFinanceDefaults()
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CreateTicketField>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const updateForm = (patch: Partial<CreateTicketWithFinanceInput>) => {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch) as CreateTicketField[]) {
        delete next[field];
      }
      return next;
    });
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
      setFieldErrors({});
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedForm = normalizeNewTicketFinanceForm(form);
    const validation = newTicketFinanceSchema.safeParse(normalizedForm);
    setError(null);
    setFieldErrors({});

    if (!validation.success) {
      setFieldErrors(zodIssuesToFieldErrors(validation.error.issues));
      setError("Перевірте поля форми.");
      return;
    }

    try {
      const isZeroPaymentPlan =
        getExpectedPaymentCount(validation.data.payment_plan) === 0;

      await onCreate({
        ...validation.data,
        gross_total: isZeroPaymentPlan
          ? "0.00"
          : normalizeMoney(validation.data.gross_total),
        discount_amount: isZeroPaymentPlan
          ? "0.00"
          : normalizeMoney(validation.data.discount_amount),
        tax_amount: isZeroPaymentPlan
          ? "0.00"
          : normalizeMoney(validation.data.tax_amount),
      });
      setOpen(false);
      setForm(createNewTicketFinanceDefaults());
      setFieldErrors({});
    } catch (createError) {
      if (createError instanceof ApiError) {
        setFieldErrors(createError.fieldErrors as FieldErrors<CreateTicketField>);
      }
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
            Додайте клієнта, фінансові дані та початковий платіжний план.
          </DialogDescription>
        </DialogHeader>

        <form
          id="new-finance-ticket-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <PaymentField label="Ім'я" error={fieldErrors.name}>
              <Input
                required
                aria-invalid={Boolean(fieldErrors.name)}
                value={form.name}
                onChange={(event) => updateForm({ name: event.target.value })}
              />
            </PaymentField>
            <PaymentField label="Email" error={fieldErrors.email}>
              <Input
                required
                type="email"
                aria-invalid={Boolean(fieldErrors.email)}
                value={form.email}
                onChange={(event) => updateForm({ email: event.target.value })}
              />
            </PaymentField>
            <PaymentField label="Телефон" error={fieldErrors.phone}>
              <Input
                required
                aria-invalid={Boolean(fieldErrors.phone)}
                value={form.phone}
                onChange={(event) => updateForm({ phone: event.target.value })}
              />
            </PaymentField>
            <PaymentField label="Instagram" error={fieldErrors.instagram}>
              <Input
                aria-invalid={Boolean(fieldErrors.instagram)}
                value={form.instagram ?? ""}
                onChange={(event) =>
                  updateForm({ instagram: event.target.value })
                }
              />
            </PaymentField>
            <PaymentField label="Тариф" error={fieldErrors.grade}>
              <SmallSelect
                value={form.grade}
                options={GRADE_SELECT_OPTIONS}
                onChange={handleGradeChange}
              />
            </PaymentField>
            <PaymentField
              label="Джерело платежу"
              error={fieldErrors.payment_sale_source}
            >
              <SmallSelect
                value={form.payment_sale_source}
                options={SALE_SOURCE_OPTIONS}
                onChange={(payment_sale_source) =>
                  updateForm({ payment_sale_source })
                }
              />
            </PaymentField>
            <PaymentField
              label="Оплата / розстрочка"
              error={fieldErrors.payment_plan}
            >
              <SmallSelect
                value={form.payment_plan}
                options={PAYMENT_PLAN_OPTIONS}
                onChange={handlePaymentPlanChange}
              />
            </PaymentField>
            <PaymentField label="До оплати" error={fieldErrors.gross_total}>
              <Input
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(fieldErrors.gross_total)}
                value={form.gross_total}
                onChange={(event) =>
                  updateForm({ gross_total: event.target.value })
                }
                onBlur={() =>
                  updateForm({ gross_total: normalizeMoney(form.gross_total) })
                }
              />
            </PaymentField>
            <PaymentField label="Знижка" error={fieldErrors.discount_amount}>
              <Input
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(fieldErrors.discount_amount)}
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
            <PaymentField label="Податок" error={fieldErrors.tax_amount}>
              <Input
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(fieldErrors.tax_amount)}
                value={form.tax_amount}
                onChange={(event) =>
                  updateForm({ tax_amount: event.target.value })
                }
                onBlur={() =>
                  updateForm({ tax_amount: normalizeMoney(form.tax_amount) })
                }
              />
            </PaymentField>
            <PaymentField label="Нетто">
              <ReadOnlyMoney
                value={Math.max(
                  toMoneyNumber(form.gross_total) - toMoneyNumber(form.tax_amount),
                  0
                ).toFixed(2)}
              />
            </PaymentField>
            <PaymentField label="NIP" error={fieldErrors.nip}>
              <Input
                aria-invalid={Boolean(fieldErrors.nip)}
                value={form.nip}
                onChange={(event) => updateForm({ nip: event.target.value })}
              />
            </PaymentField>
            <PaymentField
              label="Коментар"
              className="col-span-2"
              error={fieldErrors.finance_note}
            >
              <Textarea
                aria-invalid={Boolean(fieldErrors.finance_note)}
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
      invoice_status: "not_needed",
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
          <PaymentField label="До оплати">
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
          <PaymentField label="Нетто">
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
          <PaymentField label="QR квиток" className="col-span-2">
            <Link
              href={`/pdf/${ticket.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 w-fit items-center rounded-md text-[13px] font-medium text-foreground underline-offset-4 transition-colors hover:underline"
            >
              Переглянути / Завантажити
            </Link>
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
    ? "Платіж Stripe"
    : isPaid
      ? "Оплачено"
      : "Очікує оплати";

  return (
    <Card
      className={cn(
        "rounded-lg shadow-xs",
        isLocked && "bg-muted/20"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-[13px]">
            #{payment.installment_number}
          </Badge>
          <div className="min-w-0">
            <CardTitle className="text-[13px] font-medium">
              {formatZloty(toMoneyNumber(payment.amount))}
            </CardTitle>
            <CardDescription className="truncate text-[11px]">
              {statusText}
            </CardDescription>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium">
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
        <PaymentField label="Джерело платежу">
          <SmallSelect
            value={isStripePayment ? "site" : payment.sale_source}
            options={SALE_SOURCE_OPTIONS}
            disabled={isLocked}
            onChange={(sale_source) => onUpdate(payment.id, { sale_source })}
          />
        </PaymentField>
        <PaymentField label="Спосіб оплати">
          <SmallSelect
            value={payment.payment_method}
            options={PAYMENT_METHOD_OPTIONS}
            disabled={isLocked}
            onChange={(payment_method) =>
              onUpdate(payment.id, { payment_method })
            }
          />
        </PaymentField>
        <PaymentField label="Рахунок-фактура">
          <SmallSelect
            value={getInvoiceStatus(payment.invoice_status)}
            options={INVOICE_STATUS_OPTIONS}
            onChange={(invoice_status) =>
              onUpdate(payment.id, { invoice_status })
            }
          />
        </PaymentField>
        <PaymentField label="№ рахунку-фактури">
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
            Цю дію не можна скасувати. Платіж буде видалено з фінансів квитка.
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
    { value: "partial", label: "Часткова оплата" },
    { value: "pending", label: "Очікують оплату" },
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

function InvoiceStatusCell({ ticket }: { ticket: TicketWithFinance }) {
  const counts = getTicketInvoiceCounts(ticket);
  const title = getInvoiceCountsTitle(counts);
  const rows = [
    counts.sent > 0
      ? {
          key: "sent",
          color: "bg-success",
          label: `${counts.sent} ${pluralizeInvoiceSent(counts.sent)}`,
        }
      : null,
    counts.requested > 0
      ? {
          key: "requested",
          color: "bg-[#f59e0b]",
          label: `${counts.requested} ${pluralizeInvoiceRequested(counts.requested)}`,
        }
      : null,
  ].filter(Boolean) as { key: string; color: string; label: string }[];

  const visibleRows =
    rows.length > 0
      ? rows
      : [{ key: "not_needed", color: "bg-muted-foreground/40", label: "Не запитана" }];

  return (
    <div className="inline-flex flex-col items-start gap-1 text-left" title={title}>
      {visibleRows.map((row) => (
        <span
          key={row.key}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", row.color)} />
          <span>{row.label}</span>
        </span>
      ))}
    </div>
  );
}

function StatusIndicator({ status }: { status?: string | null }) {
  const config: Record<string, { color: string; label: string }> = {
    paid: { color: "bg-success", label: "Оплачено" },
    partial: { color: "bg-warning", label: "Частково" },
    overdue: { color: "bg-destructive", label: "Прострочено" },
    unpaid: { color: "bg-muted-foreground/30", label: "Очікує оплати" },
    untracked: { color: "bg-muted-foreground/20", label: "Без платежів" },
    pending: { color: "bg-muted-foreground/30", label: "Очікує оплати" },
    not_started: { color: "bg-muted-foreground/30", label: "Очікує оплати" },
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
  if (!grade) return <span className="text-muted-foreground">—</span>;

  return <TicketTypeBadge type={grade} />;
}

function PaymentField({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <Field className={className} data-invalid={Boolean(error) || undefined}>
      <FieldLabel className="text-[11px] text-muted-foreground">
        {label}
      </FieldLabel>
      {children}
      <FieldError className="text-[11px]" errors={error ? [{ message: error }] : []} />
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

function normalizeNewTicketFinanceForm(
  form: CreateTicketWithFinanceInput
): CreateTicketWithFinanceInput {
  return {
    ...form,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    instagram: form.instagram?.trim() ?? "",
    gross_total: form.gross_total.trim(),
    discount_amount: form.discount_amount.trim(),
    tax_amount: form.tax_amount.trim(),
    nip: form.nip.trim(),
    finance_note: form.finance_note.trim(),
  };
}

function zodIssuesToFieldErrors<TField extends string>(
  issues: ApiIssue[],
  fieldMap: Partial<Record<string, TField>> = {}
): FieldErrors<TField> {
  const fieldErrors: FieldErrors<TField> = {};

  for (const issue of issues) {
    if (!issue.message) continue;

    const rawField = issue.path?.[0];
    if (typeof rawField !== "string") continue;

    const field = fieldMap[rawField] ?? (rawField as TField);
    fieldErrors[field] ??= issue.message;
  }

  return fieldErrors;
}

function getFirstIssueMessage(issues: ApiIssue[]): string | undefined {
  return issues.find((issue) => issue.message)?.message;
}

async function readApiError(
  response: Response,
  fieldMap: Partial<Record<string, string>> = {}
): Promise<ApiError> {
  const fallbackMessage = response.statusText || "Запит не вдався.";
  const payload = await response.json().catch(() => null);

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray(payload.issues)
  ) {
    const issues = payload.issues as ApiIssue[];
    const fieldErrors = zodIssuesToFieldErrors(issues, fieldMap);
    return new ApiError(
      getFirstIssueMessage(issues) ??
        (typeof payload.message === "string" ? payload.message : fallbackMessage),
      fieldErrors
    );
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.error)) {
    const issues = payload.error as ApiIssue[];
    const fieldErrors = zodIssuesToFieldErrors(issues, fieldMap);
    return new ApiError(
      getFirstIssueMessage(issues) ??
        (typeof payload.message === "string" ? payload.message : fallbackMessage),
      fieldErrors
    );
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.errors)) {
    const issues = payload.errors as ApiIssue[];
    const fieldErrors = zodIssuesToFieldErrors(issues, fieldMap);
    return new ApiError(
      getFirstIssueMessage(issues) ??
        (typeof payload.message === "string" ? payload.message : fallbackMessage),
      fieldErrors
    );
  }

  if (payload && typeof payload === "object" && typeof payload.message === "string") {
    return new ApiError(payload.message);
  }

  return new ApiError(fallbackMessage);
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
  if (!response.ok) throw await readApiError(response);
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

async function createTicketWithFinance(
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

async function createPayment(
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

async function updatePayment(
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

async function deletePayment(paymentId: string): Promise<unknown> {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await readApiError(response);
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

function getTicketInvoiceCounts(ticket: TicketWithFinance): InvoiceCounts {
  return ticket.payments.reduce(
    (counts, payment) => {
      const status = getInvoiceStatus(payment.invoice_status);
      counts[status] += 1;
      counts.total += 1;
      return counts;
    },
    {
      requested: 0,
      sent: 0,
      not_needed: 0,
      total: 0,
    }
  );
}

function getInvoiceStatus(value: string | null | undefined): InvoiceStatus {
  if (INVOICE_STATUS_OPTIONS.some((option) => option.value === value)) {
    return value as InvoiceStatus;
  }

  return "not_needed";
}

function getInvoiceCountsTitle(counts: InvoiceCounts): string {
  return [
    `Надіслана: ${counts.sent}`,
    `Запитана: ${counts.requested}`,
    `Не запитана: ${counts.not_needed}`,
  ].join(" · ");
}

function pluralizeInvoiceSent(count: number): string {
  return count === 1 ? "Надіслана" : "Надіслані";
}

function pluralizeInvoiceRequested(count: number): string {
  return count === 1 ? "Запитана" : "Запитані";
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
  const parsed = parseMoneyNumber(value);
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
  const parsed = parseMoneyNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMoneyNumber(value: unknown): number {
  if (typeof value === "string") {
    return Number(value.trim().replace(",", ".") || 0);
  }

  return Number(value ?? 0);
}

function formatZloty(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value);
}

function formatCompactZloty(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatChartZlotyTooltip(value: unknown): string {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? formatZloty(numericValue) : String(value);
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return new Intl.NumberFormat("uk-UA", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / total);
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
