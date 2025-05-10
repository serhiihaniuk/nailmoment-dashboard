import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import {
  battleTicketTable,
  paymentInstallmentTable,
  ticketTable,
} from "./schema";

export const selectTicketSchema = createSelectSchema(ticketTable);

export const insertTicketSchema = createInsertSchema(ticketTable, {
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string(),
});

export const updateTicketSchema = insertTicketSchema
  .omit({
    id: true,
  })
  .partial();

export const insertTicketClientSchema = z.object({
  name: z.string().trim().min(1, "Ім’я обов’язкове"),
  email: z
    .string()
    .trim()
    .email("Невалідна адреса")
    .min(1, "Email обов’язковий"),
  phone: z.string().min(9, "Телефон обов’язковий"),
  instagram: z.string().optional(),
  grade: z.enum(["guest", "standard", "vip"]).default("guest"),
});

export type SelectTicketInput = z.input<typeof selectTicketSchema>;
export type Ticket = z.output<typeof selectTicketSchema>;

export type InsertTicketInput = z.input<typeof insertTicketSchema>;
export type InsertTicketOutput = z.output<typeof insertTicketSchema>;

export type UpdateTicketInput = z.input<typeof updateTicketSchema>;
export type UpdateTicketOutput = z.output<typeof updateTicketSchema>;

export const selectBattleTicketSchema = createSelectSchema(battleTicketTable);

export const insertBattleTicketSchema = createInsertSchema(battleTicketTable, {
  id: z.string().min(1, "ID is required"), // Assuming ID is provided at creation
  stripe_event_id: z.string().min(1, "Stripe Event ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  instagram: z.string().min(1, "Instagram handle is required"),
  phone: z.string().min(1, "Phone number is required"),
  // nomination_quantity has a DB default, so it can be optional here if not provided
  nomination_quantity: z.number().int().min(0).optional(),
  // date, archived, mail_sent, comment have DB defaults, so they are optional for insert
  date: z.date().optional(),
  archived: z.boolean().optional(),
  mail_sent: z.boolean().optional(),
  comment: z.string().optional(),
});

export const updateBattleTicketSchema = insertBattleTicketSchema.partial();

export type InsertBattleTicketInput = z.infer<typeof insertBattleTicketSchema>;
export type UpdateBattleTicketInput = z.infer<typeof updateBattleTicketSchema>;

export const insertBattleTicketClientSchema = z.object({
  name: z.string().trim().min(1, "Ім’я обов’язкове"),
  email: z
    .string()
    .trim()
    .email("Невалідна адреса")
    .min(1, "Email обов’язковий"),
  phone: z.string().min(9, "Телефон обов’язковий"),
  instagram: z.string().trim().min(1, "Instagram обов’язковий"),
  nomination_quantity: z
    .number()
    .int()
    .min(1, "Кількість номінацій має бути принаймні 1")
    .default(1),
  comment: z.string().optional(),
});

export type InsertBattleTicketClientInput = z.infer<
  typeof insertBattleTicketClientSchema
>;

export const selectPaymentInstallmentSchema = createSelectSchema(
  paymentInstallmentTable
);

export const insertPaymentInstallmentApiInputSchema = createInsertSchema(
  paymentInstallmentTable,
  {
    amount: z
      .string()
      .refine(
        (val) =>
          /^\d+(\.\d{1,2})?$/.test(val) &&
          !isNaN(parseFloat(val)) &&
          parseFloat(val) >= 0,
        {
          message:
            "Сума повинна бути додатнім числом з максимум двома знаками після коми.",
        }
      ),
  }
)
  .omit({ id: true, created_at: true, updated_at: true })
  .extend({
    // Ensure ticket_id is required for the API input when creating
    ticket_id: z.string().min(1, "ID квитка є обов'язковим"),
  });

export const patchPaymentInstallmentSchema = createUpdateSchema(
  paymentInstallmentTable
);

export type InsertPaymentInstallmentInput = z.infer<
  typeof insertPaymentInstallmentApiInputSchema
>;

export type PatchPaymentInstallment = z.infer<
  typeof patchPaymentInstallmentSchema
>;
