import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../../db";
import { paymentInstallmentTable, type PaymentInstallment } from "../schema";
import {
  insertPaymentInstallmentApiInputSchema,
  PatchPaymentInstallment,
  type InsertPaymentInstallmentInput,
} from "../schema.zod";
import { nanoid } from "nanoid";

export interface IPaymentInstallmentService {
  getPaymentInstallmentsForTicket: (
    ticketId: string
  ) => Promise<PaymentInstallment[]>;
  addPaymentInstallment: (
    paymentData: InsertPaymentInstallmentInput
  ) => Promise<PaymentInstallment>;
  updatePaymentInstallment: (
    id: string,
    updateData: PatchPaymentInstallment
  ) => Promise<PaymentInstallment | undefined>;
  deletePaymentInstallment: (id: string) => Promise<{ id: string } | undefined>;
}

export function createPaymentInstallmentService(
  db: DrizzleDB
): IPaymentInstallmentService {
  const getPaymentInstallmentsForTicket = async (
    ticketId: string
  ): Promise<PaymentInstallment[]> => {
    return db
      .select()
      .from(paymentInstallmentTable)
      .where(eq(paymentInstallmentTable.ticket_id, ticketId))
      .orderBy(paymentInstallmentTable.created_at);
  };

  const addPaymentInstallment = async (
    paymentData: InsertPaymentInstallmentInput
  ): Promise<PaymentInstallment> => {
    const validatedData =
      insertPaymentInstallmentApiInputSchema.parse(paymentData);
    const paymentId = nanoid(10);

    const newPayments = await db
      .insert(paymentInstallmentTable)
      .values({ ...validatedData, id: paymentId })
      .returning();

    if (newPayments.length === 0) {
      throw new Error("Payment installment insertion failed.");
    }
    return newPayments[0];
  };

  const updatePaymentInstallment = async (
    id: string,
    updateData: PatchPaymentInstallment
  ): Promise<PaymentInstallment | undefined> => {
    if (Object.keys(updateData).length === 0) {
      const currentPayment = await db
        .select()
        .from(paymentInstallmentTable)
        .where(eq(paymentInstallmentTable.id, id))
        .limit(1);
      return currentPayment[0];
    }
    const updatedPayments = await db
      .update(paymentInstallmentTable)
      .set(updateData)
      .where(eq(paymentInstallmentTable.id, id))
      .returning();

    return updatedPayments[0];
  };

  const deletePaymentInstallment = async (
    id: string
  ): Promise<{ id: string } | undefined> => {
    const deleted = await db
      .delete(paymentInstallmentTable)
      .where(eq(paymentInstallmentTable.id, id))
      .returning({ id: paymentInstallmentTable.id });
    return deleted[0];
  };

  return {
    getPaymentInstallmentsForTicket,
    addPaymentInstallment,
    updatePaymentInstallment,
    deletePaymentInstallment,
  };
}
