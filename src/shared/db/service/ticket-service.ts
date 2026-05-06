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

export type BuildTicketFinanceSummary = (
  finance: TicketFinance | null,
  payments: PaymentInstallment[]
) => TicketFinanceSummary;

export interface TicketServiceDependencies {
  buildFinanceSummary: BuildTicketFinanceSummary;
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

export function createTicketService(
  db: DrizzleDB,
  { buildFinanceSummary }: TicketServiceDependencies
): ITicketService {
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

    const [newTicket] = await db
      .insert(ticketTable)
      .values(validatedData)
      .returning();

    if (!newTicket) {
      throw new Error("Ticket insertion failed to return the new record.");
    }

    return newTicket;
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

    return hydrateTicketFinanceRows(
      tickets,
      finances,
      payments,
      buildFinanceSummary
    );
  }

  return {
    getTickets,
    getTicket,
    addTicket,
    updateTicket,
    markTicketArrived,
  };
}

export function hydrateTicketFinanceRows(
  tickets: DbTicket[],
  finances: TicketFinance[],
  payments: PaymentInstallment[],
  buildFinanceSummary: BuildTicketFinanceSummary
): TicketWithFinance[] {
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
