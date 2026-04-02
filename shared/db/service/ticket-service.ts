import { and, eq, type SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../db";
import { ticketTable, type Ticket as DbTicket } from "../schema";
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
  getTickets: (filters?: GetTicketsFilters) => Promise<DbTicket[]>;
  getTicket: (id: string) => Promise<DbTicket | undefined>;
  addTicket: (ticketData: InsertTicketInput) => Promise<DbTicket>;
  updateTicket: (
    id: string,
    updateData: UpdateTicketInput
  ) => Promise<DbTicket | undefined>;
  markTicketArrived: (id: string) => Promise<DbTicket | undefined>;
}

export function createTicketService(db: DrizzleDB): ITicketService {
  const getTickets = async (filters?: GetTicketsFilters): Promise<DbTicket[]> => {
    const showArchived = filters?.archived === true;
    const conditions: SQL[] = [];

    if (!showArchived) conditions.push(eq(ticketTable.archived, false));

    return db
      .select()
      .from(ticketTable)
      .where(and(...conditions))
      .orderBy(ticketTable.date);
  };

  const getTicket = async (id: string): Promise<DbTicket | undefined> => {
    const result = await db
      .select()
      .from(ticketTable)
      .where(eq(ticketTable.id, id))
      .limit(1);

    return result[0];
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

  return {
    getTickets,
    getTicket,
    addTicket,
    updateTicket,
    markTicketArrived,
  };
}
