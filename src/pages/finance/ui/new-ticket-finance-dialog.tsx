import { type FormEvent, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { TICKET_PRICE_BY_GRADE } from '@/entities/ticket';
import {
  GRADE_SELECT_OPTIONS,
  PAYMENT_PLAN_OPTIONS,
  SALE_SOURCE_OPTIONS,
  type PaymentPlan,
  type TicketGrade,
} from '../model/constants';
import {
  ApiError,
  type CreateTicketField,
  type CreateTicketWithFinanceInput,
  type CreatedFinanceTicket,
  type FieldErrors,
} from '../model/types';
import { newTicketFinanceSchema } from '../model/schemas';
import {
  createNewTicketFinanceDefaults,
  getExpectedPaymentCount,
  normalizeMoney,
  normalizeNewTicketFinanceForm,
  toMoneyNumber,
  zodIssuesToFieldErrors,
} from '../model/utils';
import { PaymentField, ReadOnlyMoney, SmallSelect } from './edit-cells';

export function NewTicketFinanceDialog({
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
