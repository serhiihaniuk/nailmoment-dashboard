import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DrizzleDB } from "../../db";
import {
  paymentInstallmentTable,
  ticketFinanceTable,
  type PaymentInstallment,
  type TicketFinance,
} from "../schema";
import {
  insertPaymentInstallmentApiInputSchema,
  patchPaymentInstallmentSchema,
  upsertTicketFinanceSchema,
  type InsertPaymentInstallmentInput,
  type PatchPaymentInstallmentInput,
  type UpsertTicketFinanceInput,
} from "../schema.zod";

export interface IFinanceService {
  getFinanceForTicket: (ticketId: string) => Promise<TicketFinance | null>;
  getPaymentsForTicket: (ticketId: string) => Promise<PaymentInstallment[]>;
  upsertFinanceForTicket: (
    ticketId: string,
    financeData: UpsertTicketFinanceInput
  ) => Promise<TicketFinance>;
  addPaymentForTicket: (
    ticketId: string,
    paymentData: InsertPaymentInstallmentInput
  ) => Promise<PaymentInstallment>;
  updatePayment: (
    paymentId: string,
    paymentData: PatchPaymentInstallmentInput
  ) => Promise<PaymentInstallment | undefined>;
  deletePayment: (paymentId: string) => Promise<{ id: string } | undefined>;
}

export function createFinanceService(db: DrizzleDB): IFinanceService {
  const getFinanceForTicket = async (
    ticketId: string
  ): Promise<TicketFinance | null> => {
    const result = await db
      .select()
      .from(ticketFinanceTable)
      .where(eq(ticketFinanceTable.ticket_id, ticketId))
      .limit(1);

    return result[0] ?? null;
  };

  const getPaymentsForTicket = async (
    ticketId: string
  ): Promise<PaymentInstallment[]> => {
    return db
      .select()
      .from(paymentInstallmentTable)
      .where(eq(paymentInstallmentTable.ticket_id, ticketId))
      .orderBy(paymentInstallmentTable.installment_number);
  };

  const upsertFinanceForTicket = async (
    ticketId: string,
    financeData: UpsertTicketFinanceInput
  ): Promise<TicketFinance> => {
    const validatedData = upsertTicketFinanceSchema.parse(financeData);
    const existingFinance = await getFinanceForTicket(ticketId);

    if (existingFinance) {
      if (Object.keys(validatedData).length === 0) return existingFinance;

      const updated = await db
        .update(ticketFinanceTable)
        .set(validatedData)
        .where(eq(ticketFinanceTable.id, existingFinance.id))
        .returning();

      return updated[0];
    }

    const inserted = await db
      .insert(ticketFinanceTable)
      .values({
        id: nanoid(10),
        ticket_id: ticketId,
        ...validatedData,
      })
      .returning();

    if (inserted.length === 0) {
      throw new Error("Ticket finance insertion failed.");
    }

    return inserted[0];
  };

  const addPaymentForTicket = async (
    ticketId: string,
    paymentData: InsertPaymentInstallmentInput
  ): Promise<PaymentInstallment> => {
    const validatedData =
      insertPaymentInstallmentApiInputSchema.parse(paymentData);

    const inserted = await db
      .insert(paymentInstallmentTable)
      .values({
        id: nanoid(10),
        ticket_id: ticketId,
        ...validatedData,
      })
      .returning();

    if (inserted.length === 0) {
      throw new Error("Payment insertion failed.");
    }

    return inserted[0];
  };

  const updatePayment = async (
    paymentId: string,
    paymentData: PatchPaymentInstallmentInput
  ): Promise<PaymentInstallment | undefined> => {
    const validatedData = patchPaymentInstallmentSchema.parse(paymentData);

    if (Object.keys(validatedData).length === 0) {
      const current = await db
        .select()
        .from(paymentInstallmentTable)
        .where(eq(paymentInstallmentTable.id, paymentId))
        .limit(1);

      return current[0];
    }

    const updated = await db
      .update(paymentInstallmentTable)
      .set(validatedData)
      .where(eq(paymentInstallmentTable.id, paymentId))
      .returning();

    return updated[0];
  };

  const deletePayment = async (
    paymentId: string
  ): Promise<{ id: string } | undefined> => {
    const deleted = await db
      .delete(paymentInstallmentTable)
      .where(eq(paymentInstallmentTable.id, paymentId))
      .returning({ id: paymentInstallmentTable.id });

    return deleted[0];
  };

  return {
    getFinanceForTicket,
    getPaymentsForTicket,
    upsertFinanceForTicket,
    addPaymentForTicket,
    updatePayment,
    deletePayment,
  };
}
