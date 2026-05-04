"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarIcon,
  CreditCard,
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

export function FinanceTable() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [planErrors, setPlanErrors] = useState<Record<string, string>>({});
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

      await saveFinance(ticket.id, { payment_plan: paymentPlan });

      if (expectedPaymentCount === null) {
        return;
      }

      const remainingAfterPaid = Math.max(
        toMoneyNumber(ticket.finance?.gross_total) -
          paidPayments.reduce(
            (total, payment) => total + toMoneyNumber(payment.amount),
            0
          ),
        0
      );
      const targetPaymentCount =
        expectedPaymentCount === 0
          ? 0
          : Math.max(
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
    const activeTickets = (data ?? []).filter((ticket) => !ticket.archived);
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
  }, [data, query]);

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

  const isSaving =
    saveFinanceMutation.isPending ||
    updatePaymentMutation.isPending ||
    createPaymentMutation.isPending ||
    deletePaymentMutation.isPending ||
    updateTicketMutation.isPending ||
    createTicketMutation.isPending ||
    syncPlanMutation.isPending;

  if (isLoading) {
    return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-1">
            Фінанси{" "}
            <span className="text-muted-foreground font-normal text-base">
              {tickets.length}
            </span>
          </h2>
          {isError && (
            <p className="text-sm text-destructive mt-1">
              Помилка завантаження фінансів
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NewTicketFinanceDialog
            isPending={createTicketMutation.isPending}
            onCreate={(data) => createTicketMutation.mutateAsync(data)}
          />
          <FinanceSummaryMetric label="Повна" value={formatZloty(financeTotals.gross)} />
          <FinanceSummaryMetric label="Оплачено" value={formatZloty(financeTotals.paid)} />
          <FinanceSummaryMetric
            label="Залишок"
            value={formatZloty(financeTotals.remaining)}
          />
          <FinanceSummaryMetric
            label="Прострочено"
            value={String(financeTotals.overdue)}
            tone={financeTotals.overdue > 0 ? "danger" : "muted"}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-white shadow-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-[#f8fafc] px-3 py-2">
          <div className="text-[12px] text-muted-foreground">
            Редагування зберігається після зміни поля.
          </div>
          <div className="relative w-80 max-w-full">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            />
            <Input
              placeholder="Пошук..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 bg-white pl-8 text-base shadow-none"
            />
          </div>
        </div>

        <div className="max-h-[calc(100vh-11rem)] overflow-auto bg-white">
          <table className="w-max min-w-full border-separate border-spacing-0 text-[12px]">
            <thead className="sticky top-0 z-30">
              <tr>
                <FinanceHead className="sticky left-0 z-50 min-w-12 bg-[#f8fafc]">
                  №
                </FinanceHead>
                <FinanceHead className="sticky left-12 z-50 min-w-26 bg-[#f8fafc]">
                  Дата
                </FinanceHead>
                <FinanceHead className="sticky left-38 z-50 min-w-52 bg-[#f8fafc] shadow-[8px_0_12px_-12px_rgba(15,23,42,0.55)]">
                  Ім&apos;я і фамілія
                </FinanceHead>
                <FinanceHead className="min-w-54">Email</FinanceHead>
                <FinanceHead className="min-w-34">Телефон</FinanceHead>
                <FinanceHead className="min-w-42">Інстаграм</FinanceHead>
                <FinanceHead className="min-w-28">Тариф</FinanceHead>
                <FinanceHead className="min-w-28 bg-[#e6f4df]">NIP</FinanceHead>
                <FinanceHead className="min-w-22">Знижка</FinanceHead>
                <FinanceHead className="min-w-44">Платежі</FinanceHead>
                <FinanceHead className="min-w-28 bg-[#edf7ff]">Оплачено</FinanceHead>
                <FinanceHead className="min-w-28 bg-[#e5e7eb]">Повна оплата</FinanceHead>
                <FinanceHead className="min-w-24 bg-[#fde2e2]">Податок</FinanceHead>
                <FinanceHead className="min-w-28 bg-[#e6f4df]">Чиста сума</FinanceHead>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket, index) => (
                <tr
                  key={ticket.id}
                  className="group hover:bg-[#f8fafc]"
                >
                  <FinanceCell className="sticky left-0 z-20 bg-white text-right tabular-nums text-muted-foreground group-hover:bg-[#f8fafc]">
                    {index + 1}
                  </FinanceCell>
                  <FinanceCell className="sticky left-12 z-20 bg-white tabular-nums group-hover:bg-[#f8fafc]">
                    {formatDate(ticket.date)}
                  </FinanceCell>
                  <FinanceCell className="sticky left-38 z-20 bg-white font-medium shadow-[8px_0_12px_-12px_rgba(15,23,42,0.55)] group-hover:bg-[#f8fafc]">
                    <span className="block max-w-48 truncate">{ticket.name}</span>
                  </FinanceCell>
                  <FinanceCell className="text-muted-foreground">
                    {ticket.email || "—"}
                  </FinanceCell>
                  <FinanceCell className="text-muted-foreground tabular-nums">
                    {ticket.phone?.replace(/\s+/g, "") || "—"}
                  </FinanceCell>
                  <FinanceCell className="text-muted-foreground">
                    {ticket.instagram || "—"}
                  </FinanceCell>
                  <FinanceCell>
                    <GradeMarker grade={ticket.updated_grade ?? ticket.grade} />
                  </FinanceCell>
                  <FinanceCell className="bg-[#f1f8ed]">
                    <ReadOnlyText value={ticket.finance?.nip} />
                  </FinanceCell>
                  <FinanceCell>
                    <ReadOnlyMoney value={ticket.finance?.discount_amount} />
                  </FinanceCell>

                  <FinanceCell>
                    <PaymentsDialog
                      ticket={ticket}
                      planError={planErrors[ticket.id]}
                      onCreate={(data) =>
                        createPaymentMutation.mutate({
                          ticketId: ticket.id,
                          data,
                        })
                      }
                      onUpdate={(paymentId, paymentData) =>
                        updatePaymentMutation.mutate({
                          paymentId,
                          data: paymentData,
                        })
                      }
                      onDelete={(paymentId) =>
                        deletePaymentMutation.mutate(paymentId)
                      }
                      onFinanceChange={(financeData) =>
                        saveFinanceMutation.mutate({
                          ticketId: ticket.id,
                          data: financeData,
                        })
                      }
                      onTicketChange={(ticketData) =>
                        updateTicketMutation.mutate({
                          ticketId: ticket.id,
                          data: ticketData,
                        })
                      }
                      onPaymentPlanChange={(paymentPlan) =>
                        syncPlanMutation.mutate({
                          ticket,
                          paymentPlan,
                        })
                      }
                    />
                  </FinanceCell>

                  <FinanceCell className="bg-[#f4fbff] text-right">
                    <ReadOnlyMoney value={ticket.finance_summary.paid_total} />
                  </FinanceCell>
                  <FinanceCell className="bg-[#f3f4f6] text-right">
                    <ReadOnlyMoney value={ticket.finance?.gross_total} />
                  </FinanceCell>
                  <FinanceCell className="bg-[#fff1f1] text-right">
                    <ReadOnlyMoney value={ticket.finance?.tax_amount} />
                  </FinanceCell>
                  <FinanceCell className="bg-[#f1f8ed] text-right">
                    <ReadOnlyMoney value={ticket.finance?.net_total} />
                  </FinanceCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(isFetching || isSaving) && (
          <div className="border-t border-border/50 px-3 py-2 text-[12px] text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Оновлення...
          </div>
        )}
      </div>
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
    updateForm({
      grade,
      gross_total: TICKET_PRICE_BY_GRADE[grade],
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
      await onCreate({
        ...form,
        gross_total: normalizeMoney(form.gross_total),
        discount_amount: normalizeMoney(form.discount_amount),
        tax_amount: normalizeMoney(form.tax_amount),
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
                onChange={(payment_plan) => updateForm({ payment_plan })}
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

function FinanceSummaryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "danger";
}) {
  return (
    <div
      className={cn(
        "min-w-28 rounded-md border border-border/60 bg-white px-3 py-2 shadow-xs",
        tone === "danger" && "border-destructive/30 bg-destructive/5",
        tone === "muted" && "bg-muted/40"
      )}
    >
      <div className="text-[10px] uppercase text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[14px] font-semibold tabular-nums",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PaymentsDialog({
  ticket,
  planError,
  onCreate,
  onUpdate,
  onDelete,
  onFinanceChange,
  onTicketChange,
  onPaymentPlanChange,
}: {
  ticket: TicketWithFinance;
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
  const planPaymentLimit = getExpectedPaymentCount(selectedPaymentPlan);
  const expectedPaymentCount =
    planPaymentLimit ?? Math.max(sortedPayments.length, 1);
  const displayedPaymentCount = Math.max(
    expectedPaymentCount,
    sortedPayments.length + (hasUnscheduledRemaining ? 1 : 0)
  );
  const canAddPayment =
    planPaymentLimit === null ||
    sortedPayments.length < planPaymentLimit ||
    hasUnscheduledRemaining;
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
        gross_total: TICKET_PRICE_BY_GRADE[grade],
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-white px-2 text-left text-[11px] transition-colors hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            {paidCount}/{displayedPaymentCount}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatZloty(toMoneyNumber(ticket.finance_summary.paid_total))}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-8 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate text-[18px]">
                {ticket.name}
              </DialogTitle>
              <DialogDescription className="mt-1 truncate">
                {ticket.email} · {ticket.updated_grade ?? ticket.grade}
              </DialogDescription>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-right">
              <div className="text-[10px] uppercase text-muted-foreground">
                Платежі
              </div>
              <div className="text-[16px] font-semibold tabular-nums">
                {paidCount}/{displayedPaymentCount}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 px-5 pt-4">
            <FinanceSummaryMetric
              label="Повна"
              value={formatZloty(
                toMoneyNumber(ticket.finance_summary.gross_total)
              )}
            />
            <FinanceSummaryMetric
              label="Оплачено"
              value={formatZloty(toMoneyNumber(ticket.finance_summary.paid_total))}
            />
            <FinanceSummaryMetric
              label="Залишок"
              value={formatZloty(
                toMoneyNumber(ticket.finance_summary.remaining_total)
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 px-5 pt-4">
            <PaymentField label="Ім'я">
              <TextCell
                value={ticket.name}
                onSave={(name) => onTicketChange({ name })}
              />
            </PaymentField>
            <PaymentField label="Email">
              <TextCell
                value={ticket.email}
                onSave={(email) => onTicketChange({ email })}
              />
            </PaymentField>
            <PaymentField label="Телефон">
              <TextCell
                value={ticket.phone ?? ""}
                onSave={(phone) => onTicketChange({ phone })}
              />
            </PaymentField>
            <PaymentField label="Instagram">
              <TextCell
                value={ticket.instagram ?? ""}
                onSave={(instagram) => onTicketChange({ instagram })}
              />
            </PaymentField>
            <PaymentField label="Тариф">
              <SmallSelect
                value={(ticket.updated_grade ?? ticket.grade) as TicketGrade}
                options={GRADE_SELECT_OPTIONS}
                onChange={handleGradeChange}
              />
            </PaymentField>
            <InfoTile label="Дата" value={formatDate(ticket.date)} />
          </div>

          <div className="grid grid-cols-2 gap-3 px-5 pt-4">
            <PaymentField label="Оплата / розстрочка">
              <SmallSelect
                value={selectedPaymentPlan}
                options={PAYMENT_PLAN_OPTIONS}
                disabledValues={disabledPaymentPlans}
                onChange={onPaymentPlanChange}
              />
              {planError && (
                <span className="block text-[11px] text-destructive">
                  {planError}
                </span>
              )}
            </PaymentField>
            <PaymentField label="NIP">
              <TextCell
                value={ticket.finance?.nip ?? ""}
                onSave={(nip) => onFinanceChange({ nip })}
              />
            </PaymentField>
            <PaymentField label="Знижка">
              <MoneyCell
                value={ticket.finance?.discount_amount ?? "0.00"}
                onSave={(discount_amount) => onFinanceChange({ discount_amount })}
              />
            </PaymentField>
            <PaymentField label="Повна оплата">
              <MoneyCell
                value={ticket.finance?.gross_total ?? "0.00"}
                onSave={(gross_total) =>
                  onFinanceChange(buildFinancePatchWithNet(ticket, { gross_total }))
                }
              />
            </PaymentField>
            <PaymentField label="Податок">
              <MoneyCell
                value={ticket.finance?.tax_amount ?? "0.00"}
                onSave={(tax_amount) =>
                  onFinanceChange(buildFinancePatchWithNet(ticket, { tax_amount }))
                }
              />
            </PaymentField>
            <PaymentField label="Чиста сума">
              <ReadOnlyMoney value={calculatedNetTotal(ticket)} />
            </PaymentField>
            <PaymentField label="Коментар" className="col-span-2">
              <TextCell
                value={ticket.finance?.finance_note ?? ""}
                onSave={(finance_note) => onFinanceChange({ finance_note })}
              />
            </PaymentField>
          </div>

          <div className="space-y-3 px-5 py-4">
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
              <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-[13px] text-muted-foreground">
                Платежів ще немає.
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between border-t border-border/60 bg-[#f8fafc] px-5 py-3">
          <span className="text-[12px] text-muted-foreground">
            Зміни зберігаються після виходу з поля.
          </span>
          {canAddPayment && (
            <button
              type="button"
              onClick={handleAddPayment}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Додати платіж
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-white shadow-xs",
        isLocked && "bg-muted/20"
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-[13px] font-semibold">
            #{payment.installment_number}
          </div>
          <div>
            <div className="text-[13px] font-medium">
              {formatZloty(toMoneyNumber(payment.amount))}
            </div>
            <div className="text-[11px] text-muted-foreground">{statusText}</div>
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
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
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
            disabled={isLocked}
            onChange={(invoice_status) =>
              onUpdate(payment.id, { invoice_status })
            }
          />
        </PaymentField>
        <PaymentField label="№ фактури">
          <TextCell
            value={payment.invoice_number}
            disabled={isLocked}
            onSave={(invoice_number) => onUpdate(payment.id, { invoice_number })}
          />
        </PaymentField>
        <PaymentField label="Коментар" className="col-span-2">
          <TextCell
            value={payment.comment}
            disabled={isLocked}
            onSave={(comment) => onUpdate(payment.id, { comment })}
          />
        </PaymentField>
      </div>
    </div>
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

function GradeMarker({ grade }: { grade?: string | null }) {
  const normalizedGrade = grade?.toLowerCase();

  if (normalizedGrade === TICKET_TYPE.VIP) {
    return (
      <span className="inline-flex rounded border border-[#395500] bg-[#395500] px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-white">
        vip
      </span>
    );
  }

  if (normalizedGrade === TICKET_TYPE.MAXI) {
    return (
      <span className="inline-flex rounded border border-[#8a6a3d]/30 bg-[#f3e3b3] px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-[#5b3327]">
        maxi
      </span>
    );
  }

  if (normalizedGrade === TICKET_TYPE.STANDARD) {
    return (
      <span className="inline-flex rounded border border-border/70 bg-muted/50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        standard
      </span>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex min-h-5 items-center truncate text-[12px] font-medium">
        {value}
      </div>
    </div>
  );
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
    <label className={cn("space-y-1.5", className)}>
      <span className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadOnlyText({ value }: { value?: string | null }) {
  return (
    <span className="block min-h-7 rounded-md bg-white/40 px-1.5 py-1.5 text-[12px]">
      {value?.trim() || "—"}
    </span>
  );
}

function ReadOnlyMoney({ value }: { value?: string | null }) {
  return (
    <span className="block min-h-7 rounded-md bg-white/40 px-1.5 py-1.5 text-right tabular-nums">
      {normalizeMoney(value ?? "0.00")}
    </span>
  );
}

function FinanceHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "h-9 border-r border-b border-border/60 bg-[#f8fafc] px-2 text-left align-middle text-[11px] font-semibold whitespace-nowrap text-foreground",
        className
      )}
    >
      {children}
    </th>
  );
}

function FinanceCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "h-9 border-r border-b border-border/40 px-1.5 align-middle whitespace-nowrap",
        className
      )}
    >
      {children}
    </td>
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
    <input
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
      className="h-9 w-full rounded-md border border-transparent bg-white/40 px-1.5 text-base text-right tabular-nums outline-none transition-colors hover:border-border/60 hover:bg-white focus:border-ring focus:bg-white focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
    <input
      type="text"
      defaultValue={value}
      disabled={disabled}
      onBlur={(event) => {
        const nextValue = event.target.value.trim();
        if (nextValue !== value) onSave(nextValue);
      }}
      className="h-9 w-full rounded-md border border-transparent bg-white/40 px-1.5 text-base outline-none transition-colors hover:border-border/60 hover:bg-white focus:border-ring focus:bg-white focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={disabledValues?.has(option.value)}
          >
            {option.label}
          </SelectItem>
        ))}
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
  const { ticket } = await createTicket({
    name: data.name,
    email: data.email,
    phone: data.phone,
    instagram: data.instagram,
    grade: data.grade,
  });
  const netTotal = Math.max(
    toMoneyNumber(data.gross_total) - toMoneyNumber(data.tax_amount),
    0
  ).toFixed(2);

  await saveFinance(ticket.id, {
    payment_plan: data.payment_plan,
    gross_total: data.gross_total,
    discount_amount: data.discount_amount,
    tax_amount: data.tax_amount,
    net_total: netTotal,
    nip: data.nip,
    finance_note: data.finance_note,
  });

  const paymentCount = getExpectedPaymentCount(data.payment_plan);
  if (paymentCount && paymentCount > 0) {
    const amounts = splitMoney(data.gross_total, paymentCount);
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
