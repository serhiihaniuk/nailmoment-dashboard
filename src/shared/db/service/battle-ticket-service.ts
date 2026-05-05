import { eq, and, type SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../db";
import { battleTicketTable, type BattleTicket } from "../schema";
import {
  insertBattleTicketSchema,
  updateBattleTicketSchema,
  type InsertBattleTicketInput,
  type UpdateBattleTicketInput,
} from "../schema.zod";

export interface GetBattleTicketsFilters {
  archived?: boolean;
}

export interface IBattleTicketService {
  getBattleTickets: (
    filters?: GetBattleTicketsFilters
  ) => Promise<BattleTicket[]>;
  getBattleTicket: (id: string) => Promise<BattleTicket | undefined>;
  addBattleTicket: (
    ticketData: InsertBattleTicketInput
  ) => Promise<BattleTicket>;
  updateBattleTicket: (
    id: string,
    updateData: UpdateBattleTicketInput
  ) => Promise<BattleTicket | undefined>;
}

export function createBattleTicketService(db: DrizzleDB): IBattleTicketService {
  const getBattleTickets = async (
    filters?: GetBattleTicketsFilters
  ): Promise<BattleTicket[]> => {
    const showArchived = filters?.archived === true;
    const conditions: SQL[] = [];

    conditions.push(eq(battleTicketTable.archived, showArchived));

    const query = db
      .select()
      .from(battleTicketTable)
      .where(and(...conditions))
      .orderBy(battleTicketTable.date);

    const battleTickets = await query;
    return battleTickets;
  };

  const getBattleTicket = async (
    id: string
  ): Promise<BattleTicket | undefined> => {
    const result = await db
      .select()
      .from(battleTicketTable)
      .where(eq(battleTicketTable.id, id))
      .limit(1);

    return result[0];
  };

  const addBattleTicket = async (
    ticketData: InsertBattleTicketInput
  ): Promise<BattleTicket> => {
    const validatedData = insertBattleTicketSchema.parse(ticketData);

    const newBattleTickets = await db
      .insert(battleTicketTable)
      .values(validatedData)
      .returning();

    if (newBattleTickets.length === 0) {
      throw new Error(
        "Battle ticket insertion failed to return the new record."
      );
    }
    return newBattleTickets[0];
  };

  const updateBattleTicket = async (
    id: string,
    updateData: UpdateBattleTicketInput
  ): Promise<BattleTicket | undefined> => {
    const validatedData = updateBattleTicketSchema.parse(updateData);

    // Prevent an empty update if no valid fields are provided
    if (Object.keys(validatedData).length === 0) {
      console.warn(
        "UpdateBattleTicket called with no valid data to update for id:",
        id
      );
      return getBattleTicket(id);
    }

    const updatedBattleTickets = await db
      .update(battleTicketTable)
      .set(validatedData)
      .where(eq(battleTicketTable.id, id))
      .returning();

    return updatedBattleTickets[0];
  };

  return {
    getBattleTickets,
    getBattleTicket,
    addBattleTicket,
    updateBattleTicket,
  };
}
