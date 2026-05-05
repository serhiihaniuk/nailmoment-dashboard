import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type { TicketWithFinance } from '@/shared/db/schema';
import type {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from '@/shared/db/schema.zod';
import { TICKET_PRICE_BY_GRADE } from '@/shared/const';
import { cn } from '@/shared/utils';
import {
  GRADE_SELECT_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_PLAN_OPTIONS,
  SALE_SOURCE_OPTIONS,
  type PaymentPlan,
  type TicketGrade,
} from '../model/constants';
import type { CreateTicketInput } from '../model/types';
import {
  buildFinancePatchWithNet,
  calculatedNetTotal,
  dateInputValue,
  formatDate,
  formatZloty,
  getDisplayedPaymentCount,
  getExpectedPaymentCount,
  getInvoiceStatus,
  isStripeOriginPayment,
  isZeroPaymentPlan,
  suggestedPaymentAmount,
  todayInputValue,
  toMoneyNumber,
} from '../model/utils';
import {
  DateCell,
  MoneyCell,
  PaymentField,
  ReadOnlyMoney,
  SmallSelect,
  TextCell,
} from './edit-cells';

export function PaymentsPanel({
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
