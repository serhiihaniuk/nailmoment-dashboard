import { z } from 'zod';
import { insertTicketClientSchema } from '@/shared/db/schema.zod';
import { paymentPlanValues, saleSourceValues } from './constants';
import { getExpectedPaymentCount, parseMoneyNumber, toMoneyNumber } from './utils';

export const moneyFormSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || Number.isFinite(parseMoneyNumber(value)), {
    message: "Введіть коректну суму",
  })
  .refine((value) => parseMoneyNumber(value || 0) >= 0, {
    message: "Сума не може бути від’ємною",
  });

export const newTicketFinanceSchema = insertTicketClientSchema
  .extend({
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
    const payableTotal = Math.max(grossTotal - discountAmount, 0);

    if (grossTotal <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Сума до оплати має бути більшою за 0",
        path: ["gross_total"],
      });
    }

    if (taxAmount > payableTotal) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Податок не може бути більшим за суму до оплати після знижки",
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
