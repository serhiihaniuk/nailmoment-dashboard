import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type Stripe from "stripe";

import {
  deliverBattleTicket,
  type BattleTicketDeliveryResult,
} from "@/app/battle-ticket-delivery";
import {
  parseBattleTicket,
  type BattleTicket,
  type BattleTicketId,
} from "@/entities/battle-ticket";
import { db } from "@/shared/db";
import { battleTicketTable } from "@/shared/db/schema";
import { logStripe, logStripeStep } from "./log";
import {
  mapCheckoutCustomer,
  type StripeCheckoutCustomer,
} from "./map-checkout-customer";
import type { StripeLogContext, StripeLogLevel } from "./types";

export type StripeBattleTicketFulfillmentResultKind =
  | "already_fulfilled"
  | "created";

export type StripeBattleTicketDeliveryOutcome =
  | BattleTicketDeliveryResult
  | {
      battleTicket: BattleTicket;
      mailError: null;
      mailSent: true;
      status: "already_sent";
    };

export type StripeBattleTicketFulfillmentResult = {
  battleTicketId: BattleTicketId;
  delivery: StripeBattleTicketDeliveryOutcome;
  kind: StripeBattleTicketFulfillmentResultKind;
};

export type CreateStripeBattleTicketInput = {
  battleTicketId: string;
  createdAt: Date;
  customer: StripeCheckoutCustomer;
  stripeSessionId: string;
};

export type CreateStripeBattleTicketResult =
  | {
      battleTicket: BattleTicket;
      kind: "already_exists";
    }
  | {
      battleTicket: BattleTicket;
      kind: "created";
    };

export type StripeBattleTicketStore = {
  createStripeBattleTicket: (
    input: CreateStripeBattleTicketInput
  ) => Promise<CreateStripeBattleTicketResult>;
  findByStripeSessionId: (
    stripeSessionId: string
  ) => Promise<BattleTicket | null>;
};

export type StripeBattleTicketFulfillmentLogger = {
  log: (
    level: StripeLogLevel,
    message: string,
    context?: StripeLogContext
  ) => void;
  logStep: (
    level: StripeLogLevel,
    step: string,
    message: string,
    context?: StripeLogContext
  ) => void;
};

export type StripeBattleTicketFulfillmentDependencies = {
  battleTickets: StripeBattleTicketStore;
  createBattleTicketId: () => string;
  deliverBattleTicket: (
    battleTicket: BattleTicket
  ) => Promise<BattleTicketDeliveryResult>;
  logger: StripeBattleTicketFulfillmentLogger;
  now: () => Date;
};

export type StripeBattleTicketFulfillmentInput = {
  event: Pick<Stripe.Event, "id" | "type">;
  session: Stripe.Checkout.Session;
};

function getEventContext(
  event: Pick<Stripe.Event, "id" | "type">,
  stripeSessionId: string
): StripeLogContext {
  return {
    stripeEventId: event.id,
    stripeEventType: event.type,
    stripeSessionId,
  };
}

export function createStripeBattleTicketStore(): StripeBattleTicketStore {
  const findByStripeSessionId = async (
    stripeSessionId: string
  ): Promise<BattleTicket | null> => {
    const [battleTicket] = await db
      .select()
      .from(battleTicketTable)
      .where(eq(battleTicketTable.stripe_event_id, stripeSessionId))
      .limit(1);

    return battleTicket ? parseBattleTicket(battleTicket) : null;
  };

  return {
    async createStripeBattleTicket(input) {
      const inserted = await db
        .insert(battleTicketTable)
        .values({
          archived: false,
          comment: "",
          date: input.createdAt,
          email: input.customer.email,
          id: input.battleTicketId,
          instagram: input.customer.instagram,
          mail_sent: false,
          name: input.customer.name,
          nomination_quantity: 1,
          phone: input.customer.phone,
          stripe_event_id: input.stripeSessionId,
        })
        .onConflictDoNothing()
        .returning();

      const createdBattleTicket = inserted[0];

      if (createdBattleTicket) {
        return {
          battleTicket: parseBattleTicket(createdBattleTicket),
          kind: "created",
        };
      }

      const existingBattleTicket = await findByStripeSessionId(
        input.stripeSessionId
      );

      if (!existingBattleTicket) {
        throw new Error(
          "Stripe Battle Ticket insert conflicted but no existing Battle Ticket was found."
        );
      }

      return {
        battleTicket: existingBattleTicket,
        kind: "already_exists",
      };
    },
    findByStripeSessionId,
  };
}

async function performBattleTicketDelivery({
  battleTicket,
  dependencies,
  eventContext,
}: {
  battleTicket: BattleTicket;
  dependencies: StripeBattleTicketFulfillmentDependencies;
  eventContext: StripeLogContext;
}): Promise<StripeBattleTicketDeliveryOutcome> {
  if (battleTicket.mail_sent) {
    dependencies.logger.logStep(
      "info",
      "EMAIL",
      "Battle Ticket Delivery already handed off",
      {
        ...eventContext,
        battleTicketId: battleTicket.id,
        customerEmail: battleTicket.email,
      }
    );

    return {
      battleTicket,
      mailError: null,
      mailSent: true,
      status: "already_sent",
    };
  }

  dependencies.logger.logStep(
    "info",
    "EMAIL",
    "Performing Battle Ticket Delivery",
    {
      ...eventContext,
      battleTicketId: battleTicket.id,
      customerEmail: battleTicket.email,
    }
  );

  const delivery = await dependencies.deliverBattleTicket(battleTicket);

  if (delivery.mailSent) {
    dependencies.logger.logStep(
      "info",
      "EMAIL",
      "Battle Ticket Delivery handed off",
      {
        ...eventContext,
        battleTicketId: delivery.battleTicket.id,
        customerEmail: delivery.battleTicket.email,
      }
    );
  } else {
    dependencies.logger.log("error", "Battle Ticket Delivery failed", {
      ...eventContext,
      battleTicketId: delivery.battleTicket.id,
      error: delivery.mailError,
    });
  }

  return delivery;
}

export function createStripeBattleTicketFulfillment(
  dependencies: StripeBattleTicketFulfillmentDependencies
) {
  return async function fulfillStripeBattleTicketCheckoutSession({
    event,
    session,
  }: StripeBattleTicketFulfillmentInput): Promise<StripeBattleTicketFulfillmentResult> {
    const stripeSessionId = session.id;
    const eventContext = getEventContext(event, stripeSessionId);
    const customer = mapCheckoutCustomer(session);

    dependencies.logger.logStep(
      "info",
      "PROCESS",
      "Starting battle ticket fulfillment",
      {
        ...eventContext,
        customerEmail: customer.email,
      }
    );

    const existingBattleTicket =
      await dependencies.battleTickets.findByStripeSessionId(stripeSessionId);

    if (existingBattleTicket) {
      dependencies.logger.logStep(
        "warn",
        "DB",
        "Battle ticket already exists for Stripe session",
        {
          ...eventContext,
          battleTicketId: existingBattleTicket.id,
        }
      );

      const delivery = await performBattleTicketDelivery({
        battleTicket: existingBattleTicket,
        dependencies,
        eventContext,
      });

      return {
        battleTicketId: existingBattleTicket.id,
        delivery,
        kind: "already_fulfilled",
      };
    }

    const battleTicketId = dependencies.createBattleTicketId();
    const created = await dependencies.battleTickets.createStripeBattleTicket({
      battleTicketId,
      createdAt: dependencies.now(),
      customer,
      stripeSessionId,
    });

    dependencies.logger.logStep(
      created.kind === "created" ? "info" : "warn",
      "DB",
      created.kind === "created"
        ? "Battle ticket created"
        : "Battle ticket already exists for Stripe session after insert conflict",
      {
        ...eventContext,
        battleTicketId: created.battleTicket.id,
      }
    );

    const delivery = await performBattleTicketDelivery({
      battleTicket: created.battleTicket,
      dependencies,
      eventContext,
    });

    return {
      battleTicketId: created.battleTicket.id,
      delivery,
      kind: created.kind === "created" ? "created" : "already_fulfilled",
    };
  };
}

export const fulfillStripeBattleTicketCheckoutSession =
  createStripeBattleTicketFulfillment({
    battleTickets: createStripeBattleTicketStore(),
    createBattleTicketId: () => nanoid(10),
    deliverBattleTicket,
    logger: {
      log: logStripe,
      logStep: logStripeStep,
    },
    now: () => new Date(),
  });
