import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import type { DrizzleDB } from "../../db";
import {
  ticketAttributionTable,
  ticketTable,
  type TicketAttribution,
} from "../schema";
import type {
  CheckoutAttributionClientInput,
  CheckoutAttributionStartClientInput,
} from "../schema.zod";

export type UpsertCheckoutAttributionInput =
  CheckoutAttributionClientInput;
export type CreateCheckoutAttributionStartInput =
  CheckoutAttributionStartClientInput;

export type AttachCheckoutAttributionInput = {
  clientReferenceId: string;
  stripeSessionId: string;
  ticketId: string;
};

export interface ITicketAttributionService {
  attachCheckoutAttributionToTicket: (
    input: AttachCheckoutAttributionInput
  ) => Promise<TicketAttribution | null>;
  createCheckoutAttributionStart: (
    input: CreateCheckoutAttributionStartInput
  ) => Promise<TicketAttribution>;
  upsertCheckoutAttribution: (
    input: UpsertCheckoutAttributionInput
  ) => Promise<TicketAttribution>;
}

function createClientReferenceId() {
  return `attr_${nanoid(24)}`;
}

export function createTicketAttributionService(
  db: DrizzleDB
): ITicketAttributionService {
  const findTicketIdByStripeSessionId = async (
    stripeSessionId: string
  ): Promise<string | null> => {
    const [ticket] = await db
      .select({ id: ticketTable.id })
      .from(ticketTable)
      .where(eq(ticketTable.stripe_event_id, stripeSessionId))
      .limit(1);

    return ticket?.id ?? null;
  };

  return {
    async attachCheckoutAttributionToTicket(input) {
      const now = new Date();
      const [attribution] = await db
        .update(ticketAttributionTable)
        .set({
          stripe_session_id: sql`coalesce(${ticketAttributionTable.stripe_session_id}, ${input.stripeSessionId})`,
          ticket_id: sql`coalesce(${ticketAttributionTable.ticket_id}, ${input.ticketId})`,
          updated_at: now,
        })
        .where(eq(ticketAttributionTable.client_reference_id, input.clientReferenceId))
        .returning();

      return attribution ?? null;
    },
    async createCheckoutAttributionStart(input) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const clientReferenceId = createClientReferenceId();
        const [attribution] = await db
          .insert(ticketAttributionTable)
          .values({
            client_reference_id: clientReferenceId,
            id: nanoid(16),
            landing_page: input.landingPage,
            referrer: input.referrer,
            source: "stripe_client_reference_id",
            utm_campaign: input.utm.utm_campaign ?? null,
            utm_content: input.utm.utm_content ?? null,
            utm_medium: input.utm.utm_medium ?? null,
            utm_source: input.utm.utm_source ?? null,
            utm_term: input.utm.utm_term ?? null,
          })
          .onConflictDoNothing({
            target: ticketAttributionTable.client_reference_id,
          })
          .returning();

        if (attribution) {
          return attribution;
        }
      }

      throw new Error("Ticket attribution reference creation failed.");
    },
    async upsertCheckoutAttribution(input) {
      const ticketId = await findTicketIdByStripeSessionId(input.sessionId);
      const now = new Date();
      const [attribution] = await db
        .insert(ticketAttributionTable)
        .values({
          id: nanoid(16),
          landing_page: input.landingPage,
          referrer: input.referrer,
          source: "stripe_success_redirect",
          stripe_session_id: input.sessionId,
          ticket_id: ticketId,
          utm_campaign: input.utm.utm_campaign ?? null,
          utm_content: input.utm.utm_content ?? null,
          utm_medium: input.utm.utm_medium ?? null,
          utm_source: input.utm.utm_source ?? null,
          utm_term: input.utm.utm_term ?? null,
        })
        .onConflictDoUpdate({
          set: {
            landing_page: sql`coalesce(${ticketAttributionTable.landing_page}, excluded.landing_page)`,
            referrer: sql`coalesce(${ticketAttributionTable.referrer}, excluded.referrer)`,
            ticket_id: sql`coalesce(${ticketAttributionTable.ticket_id}, excluded.ticket_id)`,
            updated_at: now,
            utm_campaign: sql`coalesce(${ticketAttributionTable.utm_campaign}, excluded.utm_campaign)`,
            utm_content: sql`coalesce(${ticketAttributionTable.utm_content}, excluded.utm_content)`,
            utm_medium: sql`coalesce(${ticketAttributionTable.utm_medium}, excluded.utm_medium)`,
            utm_source: sql`coalesce(${ticketAttributionTable.utm_source}, excluded.utm_source)`,
            utm_term: sql`coalesce(${ticketAttributionTable.utm_term}, excluded.utm_term)`,
          },
          target: ticketAttributionTable.stripe_session_id,
        })
        .returning();

      if (!attribution) {
        throw new Error("Ticket attribution upsert failed.");
      }

      return attribution;
    },
  };
}
