import { and, eq, inArray, type SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../db";
import {
  paymentInstallmentTable,
  ticketAttributionTable,
  ticketFinanceTable,
  ticketTable,
  type PaymentInstallment,
  type Ticket as DbTicket,
  type TicketAttribution,
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
  getCheckInTickets: () => Promise<CheckInTicketRow[]>;
  getCheckInTicket: (id: string) => Promise<CheckInTicketRow | undefined>;
  addTicket: (ticketData: InsertTicketInput) => Promise<DbTicket>;
  updateTicket: (
    id: string,
    updateData: UpdateTicketInput
  ) => Promise<DbTicket | undefined>;
  markTicketArrived: (id: string) => Promise<DbTicket | undefined>;
  setTicketArrival: (
    id: string,
    arrived: boolean
  ) => Promise<CheckInTicketRow | undefined>;
}

const checkInTicketSelect = {
  arrived: ticketTable.arrived,
  date: ticketTable.date,
  email: ticketTable.email,
  grade: ticketTable.grade,
  id: ticketTable.id,
  instagram: ticketTable.instagram,
  name: ticketTable.name,
  phone: ticketTable.phone,
  updated_grade: ticketTable.updated_grade,
};

export type CheckInTicketRow = Pick<
  DbTicket,
  | "arrived"
  | "date"
  | "email"
  | "grade"
  | "id"
  | "instagram"
  | "name"
  | "phone"
  | "updated_grade"
>;

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

  const getCheckInTickets = async (): Promise<CheckInTicketRow[]> => {
    return db
      .select(checkInTicketSelect)
      .from(ticketTable)
      .where(eq(ticketTable.archived, false))
      .orderBy(ticketTable.date);
  };

  const getCheckInTicket = async (
    id: string
  ): Promise<CheckInTicketRow | undefined> => {
    const [ticket] = await db
      .select(checkInTicketSelect)
      .from(ticketTable)
      .where(and(eq(ticketTable.id, id), eq(ticketTable.archived, false)))
      .limit(1);

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

  const setTicketArrival = async (
    id: string,
    arrived: boolean
  ): Promise<CheckInTicketRow | undefined> => {
    const [ticket] = await db
      .update(ticketTable)
      .set({ arrived })
      .where(and(eq(ticketTable.id, id), eq(ticketTable.archived, false)))
      .returning(checkInTicketSelect);

    return ticket;
  };

  async function hydrateTickets(
    tickets: DbTicket[]
  ): Promise<TicketWithFinance[]> {
    if (tickets.length === 0) return [];

    const ticketIds = tickets.map((ticket) => ticket.id);
    const stripeSessionIds = tickets
      .map((ticket) => ticket.stripe_event_id)
      .filter((stripeSessionId) => !stripeSessionId.startsWith("manual"));

    const [finances, payments, attributions] = await Promise.all([
      db
        .select()
        .from(ticketFinanceTable)
        .where(inArray(ticketFinanceTable.ticket_id, ticketIds)),
      db
        .select()
        .from(paymentInstallmentTable)
        .where(inArray(paymentInstallmentTable.ticket_id, ticketIds))
        .orderBy(paymentInstallmentTable.installment_number),
      stripeSessionIds.length > 0
        ? db
            .select()
            .from(ticketAttributionTable)
            .where(
              inArray(ticketAttributionTable.stripe_session_id, stripeSessionIds)
            )
        : Promise.resolve([]),
    ]);

    return hydrateTicketFinanceRows(
      tickets,
      finances,
      payments,
      buildFinanceSummary,
      attributions
    );
  }

  return {
    getTickets,
    getTicket,
    getCheckInTickets,
    getCheckInTicket,
    addTicket,
    updateTicket,
    markTicketArrived,
    setTicketArrival,
  };
}

export function hydrateTicketFinanceRows(
  tickets: DbTicket[],
  finances: TicketFinance[],
  payments: PaymentInstallment[],
  buildFinanceSummary: BuildTicketFinanceSummary,
  attributions: TicketAttribution[] = []
): TicketWithFinance[] {
  const financesByTicket = new Map(
    finances.map((finance) => [finance.ticket_id, finance])
  );
  const attributionsByStripeSession = new Map(
    attributions.map((attribution) => [
      attribution.stripe_session_id,
      attribution,
    ])
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
      attribution: attributionsByStripeSession.get(ticket.stripe_event_id) ?? null,
      finance,
      payments: ticketPayments,
      finance_summary: buildFinanceSummary(finance, ticketPayments),
    };
  });
}
