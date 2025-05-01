import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { ticketTable } from "./schema";

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
