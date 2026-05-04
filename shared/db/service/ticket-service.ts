import { and, eq, inArray, type SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../db";
import {
  paymentInstallmentTable,
  ticketFinanceTable,
  ticketTable,
  type PaymentInstallment,
  type Ticket as DbTicket,
  type TicketFinance,
  type TicketFinanceSummary,
  type TicketWithFinance,
} from "../schema";
import {
  insertTicketSchema,
  updateTicketSchema,
  type InsertTicketInput,
  type UpdateTicketInput,
} from "../schema.zod";

export interface GetTicketsFilters {
  archived?: boolean;
}

export interface ITicketService {
  getTickets: (filters?: GetTicketsFilters) => Promise<TicketWithFinance[]>;
  getTicket: (id: string) => Promise<TicketWithFinance | undefined>;
  addTicket: (ticketData: InsertTicketInput) => Promise<DbTicket>;
  updateTicket: (
    id: string,
    updateData: UpdateTicketInput
  ) => Promise<DbTicket | undefined>;
  markTicketArrived: (id: string) => Promise<DbTicket | undefined>;
}

export function createTicketService(db: DrizzleDB): ITicketService {
  const getTickets = async (
    filters?: GetTicketsFilters
  ): Promise<TicketWithFinance[]> => {
    const showArchived = filters?.archived === true;
    const conditions: SQL[] = [];

    if (!showArchived) conditions.push(eq(ticketTable.archived, false));

    const tickets = await db
      .select()
      .from(ticketTable)
      .where(and(...conditions))
      .orderBy(ticketTable.date);

    return hydrateTickets(tickets);
  };

  const getTicket = async (
    id: string
  ): Promise<TicketWithFinance | undefined> => {
    const result = await db
      .select()
      .from(ticketTable)
      .where(eq(ticketTable.id, id))
      .limit(1);

    const [ticket] = await hydrateTickets(result);
    return ticket;
  };

  const addTicket = async (ticketData: InsertTicketInput): Promise<DbTicket> => {
    const validatedData = insertTicketSchema.parse(ticketData);

    const newTickets = await db
      .insert(ticketTable)
      .values(validatedData)
      .returning();

    if (newTickets.length === 0) {
      throw new Error("Ticket insertion failed to return the new record.");
    }

    return newTickets[0];
  };

  const updateTicket = async (
    id: string,
    updateData: UpdateTicketInput
  ): Promise<DbTicket | undefined> => {
    const validatedData = updateTicketSchema.parse(updateData);

    if (Object.keys(validatedData).length === 0) {
      console.warn(
        "UpdateTicket called with no valid data to update for id:",
        id
      );
      return getTicket(id);
    }

    const updatedTickets = await db
      .update(ticketTable)
      .set(validatedData)
      .where(eq(ticketTable.id, id))
      .returning();

    return updatedTickets[0];
  };

  const markTicketArrived = async (
    id: string
  ): Promise<DbTicket | undefined> => {
    return updateTicket(id, { arrived: true });
  };

  async function hydrateTickets(
    tickets: DbTicket[]
  ): Promise<TicketWithFinance[]> {
    if (tickets.length === 0) return [];

    const ticketIds = tickets.map((ticket) => ticket.id);
    const [finances, payments] = await Promise.all([
      db
        .select()
        .from(ticketFinanceTable)
        .where(inArray(ticketFinanceTable.ticket_id, ticketIds)),
      db
        .select()
        .from(paymentInstallmentTable)
        .where(inArray(paymentInstallmentTable.ticket_id, ticketIds))
        .orderBy(paymentInstallmentTable.installment_number),
    ]);

    const financesByTicket = new Map(
      finances.map((finance) => [finance.ticket_id, finance])
    );
    const paymentsByTicket = new Map<string, PaymentInstallment[]>();

    for (const payment of payments) {
      const ticketPayments = paymentsByTicket.get(payment.ticket_id) ?? [];
      ticketPayments.push(payment);
      paymentsByTicket.set(payment.ticket_id, ticketPayments);
    }

    return tickets.map((ticket) => {
      const finance = financesByTicket.get(ticket.id) ?? null;
      const ticketPayments = paymentsByTicket.get(ticket.id) ?? [];

      return {
        ...ticket,
        finance,
        payments: ticketPayments,
        finance_summary: buildFinanceSummary(finance, ticketPayments),
      };
    });
  }

  return {
    getTickets,
    getTicket,
    addTicket,
    updateTicket,
    markTicketArrived,
  };
}

function buildFinanceSummary(
  finance: TicketFinance | null,
  payments: PaymentInstallment[]
): TicketFinanceSummary {
  const isZeroPaymentPlan =
    finance?.payment_plan === "free" || finance?.payment_plan === "sponsor";
  const grossTotal = isZeroPaymentPlan ? 0 : toMoneyNumber(finance?.gross_total);
  const paidTotal = isZeroPaymentPlan
    ? 0
    : payments.reduce((sum, payment) => {
        if (!payment.paid_date) return sum;
        return sum + toMoneyNumber(payment.amount);
      }, 0);
  const remainingTotal = Math.max(grossTotal - paidTotal, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unpaidPayments = payments.filter((payment) => !payment.paid_date);
  const nextDueDate =
    unpaidPayments
      .map((payment) => payment.due_date)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const hasOverduePayment = unpaidPayments.some(
    (payment) => payment.due_date && payment.due_date < today
  );

  const invoiceStatus =
    payments.length === 0
      ? null
      : payments.some((payment) => payment.invoice_status === "not_sent")
        ? "not_sent"
        : payments.some((payment) => payment.invoice_status === "requested")
          ? "requested"
          : payments.every((payment) => payment.invoice_status === "not_needed")
            ? "not_needed"
            : "sent";

  const paymentStatus: TicketFinanceSummary["payment_status"] =
    !finance && payments.length === 0
      ? "untracked"
      : grossTotal <= 0
        ? "paid"
      : grossTotal > 0 && paidTotal >= grossTotal
        ? "paid"
        : hasOverduePayment
          ? "overdue"
          : paidTotal > 0
            ? "partial"
            : "unpaid";

  return {
    gross_total: formatMoney(grossTotal),
    paid_total: formatMoney(paidTotal),
    remaining_total: formatMoney(remainingTotal),
    payment_count: payments.length,
    payment_status: paymentStatus,
    invoice_status: invoiceStatus,
    next_due_date: nextDueDate,
  };
}

function toMoneyNumber(value: string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}
