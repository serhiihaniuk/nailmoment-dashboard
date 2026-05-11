import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import type { DrizzleDB } from "../../db";
import {
  ticketAttributionTable,
  ticketTable,
  type TicketAttribution,
} from "../schema";
import type { CheckoutAttributionClientInput } from "../schema.zod";

export type UpsertCheckoutAttributionInput =
  CheckoutAttributionClientInput;

export interface ITicketAttributionService {
  upsertCheckoutAttribution: (
    input: UpsertCheckoutAttributionInput
  ) => Promise<TicketAttribution>;
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
            landing_page: sql`coalesce(excluded.landing_page, ${ticketAttributionTable.landing_page})`,
            referrer: sql`coalesce(excluded.referrer, ${ticketAttributionTable.referrer})`,
            ticket_id: sql`coalesce(excluded.ticket_id, ${ticketAttributionTable.ticket_id})`,
            updated_at: now,
            utm_campaign: sql`coalesce(excluded.utm_campaign, ${ticketAttributionTable.utm_campaign})`,
            utm_content: sql`coalesce(excluded.utm_content, ${ticketAttributionTable.utm_content})`,
            utm_medium: sql`coalesce(excluded.utm_medium, ${ticketAttributionTable.utm_medium})`,
            utm_source: sql`coalesce(excluded.utm_source, ${ticketAttributionTable.utm_source})`,
            utm_term: sql`coalesce(excluded.utm_term, ${ticketAttributionTable.utm_term})`,
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
