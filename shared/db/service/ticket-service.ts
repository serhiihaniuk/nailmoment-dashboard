import { eq, and, type SQL, asc } from "drizzle-orm"; // Added asc/desc
import type { DrizzleDB } from "../../db";
import {
  ticketTable,
  paymentInstallmentTable,
  type Ticket as DbTicket,
  type PaymentInstallment,
} from "../schema";
import {
  insertTicketSchema,
  updateTicketSchema,
  type InsertTicketInput,
  type UpdateTicketInput,
} from "../schema.zod"; // Adjust path if needed

// Define a new type that includes payments
export type TicketWithPayments = DbTicket & {
  paymentInstallments: PaymentInstallment[];
};

export interface GetTicketsFilters {
  archived?: boolean;
}

// Update the interface to reflect the new return types for get operations
export interface ITicketService {
  getTickets: (filters?: GetTicketsFilters) => Promise<TicketWithPayments[]>;
  getTicket: (id: string) => Promise<TicketWithPayments | undefined>;
  addTicket: (ticketData: InsertTicketInput) => Promise<DbTicket>; // Stays as DbTicket
  updateTicket: (
    id: string,
    updateData: UpdateTicketInput
  ) => Promise<DbTicket | undefined>; // Stays as DbTicket
  markTicketArrived: (id: string) => Promise<DbTicket | undefined>; // Stays as DbTicket
}

// Helper function to group flat results from the join
function groupTicketsWithPayments(
  rows: Array<{
    ticket: DbTicket;
    payment_installment: PaymentInstallment | null;
  }>
): TicketWithPayments[] {
  const ticketsMap = new Map<string, TicketWithPayments>();

  for (const row of rows) {
    const ticketData = row.ticket;
    const paymentData = row.payment_installment;

    if (!ticketsMap.has(ticketData.id)) {
      ticketsMap.set(ticketData.id, {
        ...ticketData,
        paymentInstallments: [],
      });
    }

    if (paymentData) {
      // Ensure no duplicate payments are added if a ticket has one payment and appears once
      const existingTicket = ticketsMap.get(ticketData.id)!;
      if (
        !existingTicket.paymentInstallments.find((p) => p.id === paymentData.id)
      ) {
        existingTicket.paymentInstallments.push(paymentData);
      }
    }
  }
  return Array.from(ticketsMap.values());
}

export function createTicketService(db: DrizzleDB): ITicketService {
  const getTickets = async (
    filters?: GetTicketsFilters
  ): Promise<TicketWithPayments[]> => {
    const showArchived = filters?.archived === true;
    const conditions: SQL[] = [];

    if (!showArchived) conditions.push(eq(ticketTable.archived, false));

    // Perform a LEFT JOIN and select columns from both tables
    // Drizzle will return an array of objects, each with a 'ticket' and 'payment_installment' property
    const joinedRows = await db
      .select({
        ticket: ticketTable,
        payment_installment: paymentInstallmentTable,
      })
      .from(ticketTable)
      .leftJoin(
        paymentInstallmentTable,
        eq(ticketTable.id, paymentInstallmentTable.ticket_id)
      )
      .where(and(...conditions))
      .orderBy(asc(ticketTable.date), asc(paymentInstallmentTable.created_at));

    return groupTicketsWithPayments(joinedRows);
  };

  const getTicket = async (
    id: string
  ): Promise<TicketWithPayments | undefined> => {
    const joinedRows = await db
      .select({
        ticket: ticketTable,
        payment_installment: paymentInstallmentTable,
      })
      .from(ticketTable)
      .leftJoin(
        paymentInstallmentTable,
        eq(ticketTable.id, paymentInstallmentTable.ticket_id)
      )
      .where(eq(ticketTable.id, id))
      .orderBy(asc(paymentInstallmentTable.created_at)); // Order payments for the ticket

    if (joinedRows.length === 0) {
      return undefined;
    }
    // groupTicketsWithPayments returns an array, so take the first element
    return groupTicketsWithPayments(joinedRows)[0];
  };

  const addTicket = async (
    ticketData: InsertTicketInput
  ): Promise<DbTicket> => {
    const validatedData = insertTicketSchema.parse(ticketData);

    const newTickets = await db
      .insert(ticketTable)
      .values(validatedData)
      .returning();

    if (newTickets.length === 0) {
      throw new Error("Ticket insertion failed to return the new record.");
    }
    return newTickets[0]; // Returns the base ticket, not with payments
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
      const result = await db
        .select()
        .from(ticketTable)
        .where(eq(ticketTable.id, id))
        .limit(1);
      return result[0];
    }

    const updatedTickets = await db
      .update(ticketTable)
      .set(validatedData)
      .where(eq(ticketTable.id, id))
      .returning();

    return await getTicket(updatedTickets[0].id);
  };

  const markTicketArrived = async (
    id: string
  ): Promise<DbTicket | undefined> => {
    return updateTicket(id, { arrived: true });
  };

  return {
    getTickets,
    getTicket,
    addTicket,
    updateTicket,
    markTicketArrived,
  };
}
