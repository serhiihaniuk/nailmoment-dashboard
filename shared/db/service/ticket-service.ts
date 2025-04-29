import { eq, and, type SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../db";
import { ticketTable, type Ticket } from "../schema"; // Adjust path if needed
import {
  insertTicketSchema,
  updateTicketSchema,
  type InsertTicketInput,
  type UpdateTicketInput,
} from "../schema.zod"; // Adjust path if needed

export interface GetTicketsFilters {
  archived?: boolean;
}

export interface ITicketService {
  getTickets: (filters?: GetTicketsFilters) => Promise<Ticket[]>;
  getTicket: (id: string) => Promise<Ticket | undefined>;
  addTicket: (ticketData: InsertTicketInput) => Promise<Ticket>;
  updateTicket: (
    id: string,
    updateData: UpdateTicketInput
  ) => Promise<Ticket | undefined>;
  markTicketArrived: (id: string) => Promise<Ticket | undefined>;
}

export function createTicketService(db: DrizzleDB): ITicketService {
  const getTickets = async (filters?: GetTicketsFilters): Promise<Ticket[]> => {
    const showArchived = filters?.archived === true;
    const conditions: SQL[] = [];

    conditions.push(eq(ticketTable.archived, showArchived));

    const query = db
      .select()
      .from(ticketTable)
      .where(and(...conditions))
      .orderBy(ticketTable.date);

    const tickets = await query;
    return tickets;
  };

  const getTicket = async (id: string): Promise<Ticket | undefined> => {
    const result = await db
      .select()
      .from(ticketTable)
      .where(eq(ticketTable.id, id))
      .limit(1);

    return result[0];
  };

  const addTicket = async (ticketData: InsertTicketInput): Promise<Ticket> => {
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
  ): Promise<Ticket | undefined> => {
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

  const markTicketArrived = async (id: string): Promise<Ticket | undefined> => {
    return updateTicket(id, { arrived: true });
  };

  // Return the object containing the service methods
  return {
    getTickets,
    getTicket,
    addTicket,
    updateTicket,
    markTicketArrived,
  };
}
