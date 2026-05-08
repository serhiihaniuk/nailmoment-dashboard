import Link from 'next/link';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
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
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/shared/ui/empty';
import { SlidePanel } from '@/shared/ui/slide-panel';
import { Badge } from '@/shared/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Separator } from '@/shared/ui/separator';
import { Switch } from '@/shared/ui/switch';
import type {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallmentInput,
  UpsertTicketFinanceInput,
} from '@/shared/db/schema.zod';
import {
  TICKET_PRICE_BY_GRADE,
  calculateTicketPaymentCoverage,
  getPaymentDeleteDenialReason,
  getPaymentFieldEditDenialReason,
  isStripeTicketPayment,
  type PaymentEditField,
  type PaymentEditPolicyContext,
  type TicketWithFinance,
} from '@/entities/ticket';
import { cn } from '@/shared/lib/cn';
import type { SaveStatus } from '../model/autosave-status';
import {
  financeFieldKey,
  paymentFieldKey,
  ticketFieldKey,
} from '../model/autosave-status';
import {
  GRADE_SELECT_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_PLAN_OPTIONS,
  SALE_SOURCE_OPTIONS,
  type PaymentPlan,
  type TicketGrade,
} from '../model/constants';
import type { FinanceTicketPatch } from '../model/finance-cache';
import {
  buildFinancePatchWithNet,
  calculatedPayableTotal,
  calculatedNetTotal,
  dateInputValue,
  formatDate,
  formatZloty,
  getDisplayedPaymentCount,
  getExpectedPaymentCount,
  getInvoiceStatus,
  getUnscheduledGrossPaymentAmount,
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
  SaveStatusLine,
  SmallSelect,
  TextCell,
  TextareaCell,
} from './edit-cells';
import { DiscountCombobox } from './discount-combobox';

const PAYMENT_PLAN_UPDATE_DENIAL_MESSAGE = "Payment plan is updating.";

export function PaymentsPanel({
  ticket,
  open,
  onClose,
  closeBlockedByError,
  closePending,
  discountOptions,
  paymentActionError,
  getFieldStatus,
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
  closeBlockedByError: boolean;
  closePending: boolean;
  discountOptions: readonly string[];
  paymentActionError?: string | undefined;
  getFieldStatus: (fieldKey: string) => SaveStatus;
  onCreate: (data: InsertPaymentInstallmentInput) => void;
  onUpdate: (
    paymentId: string,
    data: PatchPaymentInstallmentInput,
    fieldKey: string
  ) => void;
  onDelete: (paymentId: string) => void;
  onFinanceChange: (data: UpsertTicketFinanceInput, fieldKey: string) => void;
  onTicketChange: (data: FinanceTicketPatch, fieldKey: string) => void;
  onPaymentPlanChange: (paymentPlan: PaymentPlan, fieldKey: string) => void;
}) {
  const sortedPayments = [...ticket.payments].sort(
    (a, b) => a.installment_number - b.installment_number
  );
  const paidCount = sortedPayments.filter((payment) => payment.is_paid).length;
  const paymentCoverage = calculateTicketPaymentCoverage(
    ticket.finance,
    sortedPayments
  );
  const hasPaymentCoverageMismatch = paymentCoverage.status !== "balanced";
  const paymentCoverageDifference = Math.abs(
    paymentCoverage.scheduledDifference
  );
  const hasMissingPaymentCoverage =
    paymentCoverage.status === "under_scheduled";
  const hasOverPaymentCoverage =
    paymentCoverage.status === "over_scheduled";
  const paymentCoverageMismatchText =
    hasMissingPaymentCoverage
      ? `Бракує ${formatZloty(paymentCoverageDifference)} у запланованих платежах`
      : hasOverPaymentCoverage
        ? `Заплановано на ${formatZloty(paymentCoverageDifference)} більше`
        : null;
  const paymentCoverageTitle = [
    `Платежі: ${formatZloty(paymentCoverage.paidTotal)} оплачено`,
    `${formatZloty(paymentCoverage.pendingScheduledTotal)} заплановано`,
    hasMissingPaymentCoverage
      ? `${formatZloty(paymentCoverage.missingScheduledTotal)} не заплановано`
      : null,
    hasOverPaymentCoverage
      ? `${formatZloty(paymentCoverage.overScheduledTotal)} понад вартість`
      : null,
    `${formatZloty(paymentCoverage.payableTotal)} вартість`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" / ");
  const paymentCoverageEqualsTotal = hasOverPaymentCoverage
    ? paymentCoverage.scheduledTotal
    : paymentCoverage.payableTotal;
  const paymentCoverageEqualsLabel = hasOverPaymentCoverage
    ? "у платежах"
    : "вартість";
  const unscheduledGrossPaymentAmount =
    getUnscheduledGrossPaymentAmount(ticket);
  const hasUnscheduledGrossPaymentAmount =
    toMoneyNumber(unscheduledGrossPaymentAmount) >= 0.01;
  const selectedPaymentPlan = ticket.finance?.payment_plan ?? "full";
  const selectedGrade =
    GRADE_SELECT_OPTIONS.find(
      (option) => option.value === (ticket.updated_grade ?? ticket.grade)
    )?.value ?? "standard";
  const gradeTransitionLabel =
    ticket.updated_grade &&
    ticket.updated_grade.toLowerCase() !== ticket.grade.toLowerCase()
      ? `${ticket.grade} -> ${ticket.updated_grade}`
      : null;
  const nameFieldKey = ticketFieldKey(ticket.id, "name");
  const phoneFieldKey = ticketFieldKey(ticket.id, "phone");
  const emailFieldKey = ticketFieldKey(ticket.id, "email");
  const instagramFieldKey = ticketFieldKey(ticket.id, "instagram");
  const gradeFieldKey = ticketFieldKey(ticket.id, "updated_grade");
  const paymentPlanFieldKey = financeFieldKey(ticket.id, "payment_plan");
  const grossTotalFieldKey = financeFieldKey(ticket.id, "gross_total");
  const taxAmountFieldKey = financeFieldKey(ticket.id, "tax_amount");
  const discountAmountFieldKey = financeFieldKey(ticket.id, "discount_amount");
  const nipFieldKey = financeFieldKey(ticket.id, "nip");
  const financeNoteFieldKey = financeFieldKey(ticket.id, "finance_note");
  const paymentPlanStatus = getFieldStatus(paymentPlanFieldKey);
  const isPaymentPlanSaving = paymentPlanStatus.state === "saving";
  const hasZeroPaymentPlan = isZeroPaymentPlan(selectedPaymentPlan);
  const planPaymentLimit = getExpectedPaymentCount(selectedPaymentPlan);
  const displayedPaymentCount = getDisplayedPaymentCount(ticket);
  const canAddPayment =
    !isPaymentPlanSaving &&
    (planPaymentLimit === null || sortedPayments.length < planPaymentLimit);
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
    }, gradeFieldKey);
    onFinanceChange(
      buildFinancePatchWithNet(ticket, {
        gross_total: hasZeroPaymentPlan ? "0.00" : TICKET_PRICE_BY_GRADE[grade],
      }),
      grossTotalFieldKey
    );
  };

  const handleAddPayment = () => {
    if (!canAddPayment) return;

    const installmentNumber = nextPaymentNumber + 1;
    onCreate({
      installment_number: installmentNumber,
      amount: hasUnscheduledGrossPaymentAmount
        ? unscheduledGrossPaymentAmount
        : suggestedPaymentAmount(ticket, installmentNumber),
      sale_source: "direct_transfer",
      due_date: "",
      is_paid: false,
      paid_date: "",
      payment_method: "other",
      invoice_status: "not_needed",
      invoice_number: "",
      comment: "",
    });
  };

  const closeStatusContent = closePending ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Завершуємо збереження перед закриттям...
    </span>
  ) : closeBlockedByError ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-destructive">
      <AlertCircle className="h-3 w-3" />
      Не вдалося зберегти. Панель залишилась відкритою.
    </span>
  ) : (
    <span className="text-[11px] text-muted-foreground">
      Зміни зберігаються автоматично
    </span>
  );

  const footerContent = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {closeStatusContent}
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

      {/* Contact info section */}
      <div className="space-y-4 mb-6">
        <h3 className="text-label-caps">Контактна інформація</h3>
        <div className="grid grid-cols-2 gap-3">
          <PaymentField
            label="Ім'я"
            saveStatus={getFieldStatus(nameFieldKey)}
          >
            <TextCell
              value={ticket.name}
              onSave={(name) => onTicketChange({ name }, nameFieldKey)}
            />
          </PaymentField>
          <PaymentField
            label="Телефон"
            saveStatus={getFieldStatus(phoneFieldKey)}
          >
            <TextCell
              value={ticket.phone ?? ""}
              onSave={(phone) => onTicketChange({ phone }, phoneFieldKey)}
            />
          </PaymentField>
          <PaymentField
            label="Email"
            saveStatus={getFieldStatus(emailFieldKey)}
          >
            <TextCell
              value={ticket.email}
              onSave={(email) => onTicketChange({ email }, emailFieldKey)}
            />
          </PaymentField>
          <PaymentField
            label="Instagram"
            saveStatus={getFieldStatus(instagramFieldKey)}
          >
            <TextCell
              value={ticket.instagram ?? ""}
              onSave={(instagram) =>
                onTicketChange({ instagram }, instagramFieldKey)
              }
            />
          </PaymentField>
        </div>
      </div>

      {/* Finance details section */}
      <div className="space-y-4 mb-6">
        <h3 className="text-label-caps">Фінансові деталі</h3>
        <div className="grid grid-cols-2 gap-3">
          <PaymentField
            label="Тариф"
            saveStatus={getFieldStatus(gradeFieldKey)}
          >
            <SmallSelect
              value={selectedGrade}
              options={GRADE_SELECT_OPTIONS}
              onChange={handleGradeChange}
            />
            {gradeTransitionLabel && (
              <p className="pt-1 text-[11px] font-medium text-muted-foreground">
                {gradeTransitionLabel}
              </p>
            )}
          </PaymentField>
          <PaymentField
            label="Оплата / розстрочка"
            saveStatus={paymentPlanStatus}
          >
            <SmallSelect
              value={selectedPaymentPlan}
              options={PAYMENT_PLAN_OPTIONS}
              disabled={isPaymentPlanSaving}
              disabledValues={disabledPaymentPlans}
              onChange={(paymentPlan) =>
                onPaymentPlanChange(paymentPlan, paymentPlanFieldKey)
              }
            />
          </PaymentField>
          <PaymentField
            label="Ціна до знижки"
            saveStatus={getFieldStatus(grossTotalFieldKey)}
          >
            <MoneyCell
              value={hasZeroPaymentPlan ? "0.00" : ticket.finance?.gross_total ?? "0.00"}
              disabled={hasZeroPaymentPlan}
              onSave={(gross_total) =>
                onFinanceChange(
                  buildFinancePatchWithNet(ticket, { gross_total }),
                  grossTotalFieldKey
                )
              }
            />
          </PaymentField>
          <PaymentField
            label="Податок"
            saveStatus={getFieldStatus(taxAmountFieldKey)}
          >
            <MoneyCell
              value={hasZeroPaymentPlan ? "0.00" : ticket.finance?.tax_amount ?? "0.00"}
              disabled={hasZeroPaymentPlan}
              onSave={(tax_amount) =>
                onFinanceChange(
                  buildFinancePatchWithNet(ticket, { tax_amount }),
                  taxAmountFieldKey
                )
              }
            />
          </PaymentField>
          <PaymentField
            label="Знижка"
            saveStatus={getFieldStatus(discountAmountFieldKey)}
          >
            <DiscountCombobox
              value={hasZeroPaymentPlan ? "0.00" : ticket.finance?.discount_amount ?? "0.00"}
              grossTotal={hasZeroPaymentPlan ? "0.00" : ticket.finance?.gross_total ?? "0.00"}
              options={discountOptions}
              disabled={hasZeroPaymentPlan}
              onSave={(discount_amount) =>
                onFinanceChange(
                  buildFinancePatchWithNet(ticket, { discount_amount }),
                  discountAmountFieldKey
                )
              }
            />
          </PaymentField>
          <PaymentField label="Вартість">
            <ReadOnlyMoney value={calculatedPayableTotal(ticket)} />
          </PaymentField>
          <PaymentField label="Нетто">
            <ReadOnlyMoney value={calculatedNetTotal(ticket)} />
          </PaymentField>
          <PaymentField
            label="NIP"
            saveStatus={getFieldStatus(nipFieldKey)}
          >
            <TextCell
              value={ticket.finance?.nip ?? ""}
              onSave={(nip) => onFinanceChange({ nip }, nipFieldKey)}
            />
          </PaymentField>
          {/* Summary stats */}
          <div className="col-span-2 flex items-center gap-4 pt-1 text-[12px]">
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
        <PaymentField
          label="Коментар"
          saveStatus={getFieldStatus(financeNoteFieldKey)}
        >
          <TextareaCell
            value={ticket.finance?.finance_note ?? ""}
            onSave={(finance_note) =>
              onFinanceChange({ finance_note }, financeNoteFieldKey)
            }
          />
        </PaymentField>
      </div>

      {/* Payments section */}
      <div className="flex flex-col gap-2.5">
        <h3 className="text-label-caps">Платежі</h3>
        <div
          title={paymentCoverageTitle}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            hasPaymentCoverageMismatch
              ? "border-warning/50 bg-warning/10"
              : "border-border/50 bg-muted/20"
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {hasPaymentCoverageMismatch && (
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
            )}
            <span className="font-medium text-foreground">Платежі:</span>
            <span className="tabular-nums text-success">
              {formatZloty(paymentCoverage.paidTotal)} оплачено
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="tabular-nums">
              {formatZloty(paymentCoverage.pendingScheduledTotal)} заплановано
            </span>
            {hasMissingPaymentCoverage && (
              <>
                <span className="text-muted-foreground">+</span>
                <span className="tabular-nums text-warning">
                  {formatZloty(paymentCoverage.missingScheduledTotal)} не заплановано
                </span>
              </>
            )}
            <span className="text-muted-foreground">=</span>
            <span className="tabular-nums">
              {formatZloty(paymentCoverageEqualsTotal)} {paymentCoverageEqualsLabel}
            </span>
            {hasOverPaymentCoverage && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="tabular-nums">
                  {formatZloty(paymentCoverage.payableTotal)} вартість
                </span>
              </>
            )}
          </div>
          {paymentCoverageMismatchText && (
            <p className="mt-1 text-[11px] font-medium text-warning">
              {paymentCoverageMismatchText}
            </p>
          )}
        </div>
        {paymentActionError && (
          <p className="flex items-center gap-1.5 text-[12px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {paymentActionError}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {sortedPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              paymentEditContext={{
                ticket: {
                  stripe_event_id: ticket.stripe_event_id,
                },
                payment,
              }}
              paymentsLocked={isPaymentPlanSaving}
              getFieldStatus={getFieldStatus}
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
  paymentEditContext,
  paymentsLocked,
  getFieldStatus,
  onUpdate,
  onDelete,
}: {
  payment: TicketWithFinance["payments"][number];
  paymentEditContext: PaymentEditPolicyContext;
  paymentsLocked: boolean;
  getFieldStatus: (fieldKey: string) => SaveStatus;
  onUpdate: (
    paymentId: string,
    data: PatchPaymentInstallmentInput,
    fieldKey: string
  ) => void;
  onDelete: (paymentId: string) => void;
}) {
  const isPaid = payment.is_paid;
  const paidDateValue = dateInputValue(payment.paid_date);
  const isStripePayment = isStripeTicketPayment(paymentEditContext);
  const getUiFieldDenialReason = (
    field: PaymentEditField
  ): string | undefined =>
    paymentsLocked
      ? PAYMENT_PLAN_UPDATE_DENIAL_MESSAGE
      : getPaymentFieldEditDenialReason(paymentEditContext, field)?.message;
  const isPaidDenialReason = getUiFieldDenialReason("is_paid");
  const amountDenialReason = getUiFieldDenialReason("amount");
  const paidDateDenialReason = getUiFieldDenialReason("paid_date");
  const dueDateDenialReason = getUiFieldDenialReason("due_date");
  const saleSourceDenialReason = getUiFieldDenialReason("sale_source");
  const paymentMethodDenialReason = getUiFieldDenialReason("payment_method");
  const invoiceStatusDenialReason = getUiFieldDenialReason("invoice_status");
  const invoiceNumberDenialReason = getUiFieldDenialReason("invoice_number");
  const commentDenialReason = getUiFieldDenialReason("comment");
  const deleteDenialReason = paymentsLocked
    ? PAYMENT_PLAN_UPDATE_DENIAL_MESSAGE
    : getPaymentDeleteDenialReason(paymentEditContext)?.message;
  const amountFieldKey = paymentFieldKey(payment.id, "amount");
  const isPaidFieldKey = paymentFieldKey(payment.id, "is_paid");
  const paidDateFieldKey = paymentFieldKey(payment.id, "paid_date");
  const dueDateFieldKey = paymentFieldKey(payment.id, "due_date");
  const saleSourceFieldKey = paymentFieldKey(payment.id, "sale_source");
  const paymentMethodFieldKey = paymentFieldKey(payment.id, "payment_method");
  const invoiceStatusFieldKey = paymentFieldKey(payment.id, "invoice_status");
  const invoiceNumberFieldKey = paymentFieldKey(payment.id, "invoice_number");
  const commentFieldKey = paymentFieldKey(payment.id, "comment");
  const statusText = isStripePayment
    ? "Платіж Stripe"
    : isPaid
      ? "Оплачено"
      : "Очікує оплати";

  return (
    <Card
      className={cn(
        "rounded-lg shadow-xs",
        (paymentsLocked || isStripePayment) && "bg-muted/20"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="rounded-md px-1.5 py-0.5 text-[12px]">
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

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end">
            <label className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium">
              <span>Оплачено</span>
              <Switch
                checked={isPaid}
                disabled={Boolean(isPaidDenialReason)}
                title={isPaidDenialReason}
                onCheckedChange={(checked) => {
                  const patch: PatchPaymentInstallmentInput = {
                    is_paid: checked,
                  };
                  if (checked && !paidDateValue) {
                    patch.paid_date = todayInputValue();
                  }
                  onUpdate(
                    payment.id,
                    patch,
                    isPaidFieldKey
                  );
                }}
              />
            </label>
            <SaveStatusLine
              status={getFieldStatus(isPaidFieldKey)}
              className="min-h-3 justify-end"
            />
          </div>
          <DeletePaymentButton
            denialReason={deleteDenialReason}
            onConfirm={() => onDelete(payment.id)}
          />
        </div>
      </CardHeader>

      <Separator />
      <CardContent className="grid grid-cols-1 gap-2 px-3 py-2.5">
        <PaymentField
          compact
          label="Сума"
          saveStatus={getFieldStatus(amountFieldKey)}
        >
          <MoneyCell
            value={payment.amount}
            disabled={Boolean(amountDenialReason)}
            disabledReason={amountDenialReason}
            onSave={(amount) => onUpdate(payment.id, { amount }, amountFieldKey)}
          />
        </PaymentField>
        <PaymentField
          compact
          label="Дата оплати"
          saveStatus={getFieldStatus(paidDateFieldKey)}
        >
          <DateCell
            value={paidDateValue}
            disabled={Boolean(paidDateDenialReason)}
            disabledReason={paidDateDenialReason}
            onSave={(paid_date) =>
              onUpdate(payment.id, { paid_date }, paidDateFieldKey)
            }
          />
        </PaymentField>
        <PaymentField
          compact
          label="Термін оплати"
          saveStatus={getFieldStatus(dueDateFieldKey)}
        >
          <DateCell
            value={dateInputValue(payment.due_date)}
            disabled={Boolean(dueDateDenialReason)}
            disabledReason={dueDateDenialReason}
            onSave={(due_date) =>
              onUpdate(payment.id, { due_date }, dueDateFieldKey)
            }
          />
        </PaymentField>
        <PaymentField
          compact
          label="Джерело платежу"
          saveStatus={getFieldStatus(saleSourceFieldKey)}
        >
          <SmallSelect
            value={isStripePayment ? "site" : payment.sale_source}
            options={SALE_SOURCE_OPTIONS}
            disabled={Boolean(saleSourceDenialReason)}
            disabledReason={saleSourceDenialReason}
            onChange={(sale_source) =>
              onUpdate(payment.id, { sale_source }, saleSourceFieldKey)
            }
          />
        </PaymentField>
        <PaymentField
          compact
          label="Спосіб оплати"
          saveStatus={getFieldStatus(paymentMethodFieldKey)}
        >
          <SmallSelect
            value={payment.payment_method}
            options={PAYMENT_METHOD_OPTIONS}
            disabled={Boolean(paymentMethodDenialReason)}
            disabledReason={paymentMethodDenialReason}
            onChange={(payment_method) =>
              onUpdate(payment.id, { payment_method }, paymentMethodFieldKey)
            }
          />
        </PaymentField>
        <PaymentField
          compact
          label="Рахунок-фактура"
          saveStatus={getFieldStatus(invoiceStatusFieldKey)}
        >
          <SmallSelect
            value={getInvoiceStatus(payment.invoice_status)}
            options={INVOICE_STATUS_OPTIONS}
            disabled={Boolean(invoiceStatusDenialReason)}
            disabledReason={invoiceStatusDenialReason}
            onChange={(invoice_status) =>
              onUpdate(payment.id, { invoice_status }, invoiceStatusFieldKey)
            }
          />
        </PaymentField>
        <PaymentField
          compact
          label="№ рахунку-фактури"
          saveStatus={getFieldStatus(invoiceNumberFieldKey)}
        >
          <TextCell
            value={payment.invoice_number}
            disabled={Boolean(invoiceNumberDenialReason)}
            disabledReason={invoiceNumberDenialReason}
            onSave={(invoice_number) =>
              onUpdate(payment.id, { invoice_number }, invoiceNumberFieldKey)
            }
          />
        </PaymentField>
        <PaymentField
          compact
          label="Коментар"
          saveStatus={getFieldStatus(commentFieldKey)}
        >
          <TextareaCell
            value={payment.comment}
            disabled={Boolean(commentDenialReason)}
            disabledReason={commentDenialReason}
            onSave={(comment) => onUpdate(payment.id, { comment }, commentFieldKey)}
          />
        </PaymentField>
      </CardContent>
    </Card>
  );
}

function DeletePaymentButton({
  denialReason,
  onConfirm,
}: {
  denialReason?: string | undefined;
  onConfirm: () => void;
}) {
  if (denialReason) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title={denialReason}
        aria-label={denialReason}
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
