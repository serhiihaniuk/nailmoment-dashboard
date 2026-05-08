import type Stripe from "stripe";
import { describe, expect, test } from "vitest";

import {
  parseBattleTicket,
  type BattleTicket,
} from "@/entities/battle-ticket";
import type { BattleTicketDeliveryResult } from "@/app/battle-ticket-delivery";
import {
  createStripeBattleTicketFulfillment,
  type CreateStripeBattleTicketInput,
  type StripeBattleTicketFulfillmentDependencies,
  type StripeBattleTicketFulfillmentLogger,
} from "./stripe-battle-ticket-fulfillment";

const checkoutEvent = {
  id: "evt_battle",
  type: "checkout.session.completed",
} satisfies Pick<Stripe.Event, "id" | "type">;

const noopLogger = {
  log: () => undefined,
  logStep: () => undefined,
} satisfies StripeBattleTicketFulfillmentLogger;

function createSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    custom_fields: [
      {
        key: "name",
        text: {
          value: "Battle Artist",
        },
        type: "text",
      },
      {
        key: "instagram",
        text: {
          value: "@battle_artist",
        },
        type: "text",
      },
    ],
    customer_details: {
      address: null,
      email: "battle@example.com",
      name: null,
      phone: "+48123123123",
      tax_exempt: "none",
      tax_ids: [],
    },
    customer_email: null,
    id: "cs_test_battle",
    metadata: {
      event: "nailmoment",
      type: "battle",
    },
    payment_status: "paid",
    ...overrides,
  } as Stripe.Checkout.Session;
}

function makeBattleTicket(overrides: Record<string, unknown> = {}): BattleTicket {
  return parseBattleTicket({
    archived: false,
    comment: "",
    date: "2026-01-01T12:00:00.000Z",
    email: "battle@example.com",
    id: "battle_created",
    instagram: "battle_artist",
    mail_sent: false,
    name: "Battle Artist",
    nomination_quantity: 1,
    payment_type: "full",
    phone: "+48123123123",
    photos_sent: false,
    stripe_event_id: "cs_test_battle",
    ...overrides,
  });
}

function successfulDelivery(
  battleTicket: BattleTicket
): BattleTicketDeliveryResult {
  return {
    battleTicket: parseBattleTicket({
      ...battleTicket,
      mail_sent: true,
    }),
    mailError: null,
    mailSent: true,
    status: "sent",
  };
}

function failedDelivery(battleTicket: BattleTicket): BattleTicketDeliveryResult {
  return {
    battleTicket,
    mailError: "Provider down",
    mailSent: false,
    status: "failed",
  };
}

function createFakeDependencies({
  deliveryResult = successfulDelivery,
  initialBattleTickets = [],
}: {
  deliveryResult?: (battleTicket: BattleTicket) => BattleTicketDeliveryResult;
  initialBattleTickets?: BattleTicket[];
} = {}) {
  const createdAt = new Date("2026-01-01T12:00:00.000Z");
  const createBattleTicketRequests: CreateStripeBattleTicketInput[] = [];
  const deliveryCalls: BattleTicket[] = [];
  const battleTicketsBySession = new Map(
    initialBattleTickets.map((battleTicket) => [
      battleTicket.stripe_event_id,
      battleTicket,
    ])
  );

  const dependencies = {
    battleTickets: {
      createStripeBattleTicket: async (input) => {
        createBattleTicketRequests.push(input);
        const existingBattleTicket = battleTicketsBySession.get(
          input.stripeSessionId
        );

        if (existingBattleTicket) {
          return {
            battleTicket: existingBattleTicket,
            kind: "already_exists",
          };
        }

        const battleTicket = makeBattleTicket({
          date: input.createdAt,
          email: input.customer.email,
          id: input.battleTicketId,
          instagram: input.customer.instagram,
          name: input.customer.name,
          phone: input.customer.phone,
          stripe_event_id: input.stripeSessionId,
        });
        battleTicketsBySession.set(input.stripeSessionId, battleTicket);

        return {
          battleTicket,
          kind: "created",
        };
      },
      findByStripeSessionId: async (stripeSessionId) => {
        return battleTicketsBySession.get(stripeSessionId) ?? null;
      },
    },
    createBattleTicketId: () => "battle_created",
    deliverBattleTicket: async (battleTicket) => {
      deliveryCalls.push(battleTicket);
      return deliveryResult(battleTicket);
    },
    logger: noopLogger,
    now: () => createdAt,
  } satisfies StripeBattleTicketFulfillmentDependencies;

  return {
    battleTicketsBySession,
    createBattleTicketRequests,
    createdAt,
    deliveryCalls,
    dependencies,
  };
}

describe("Stripe Battle Ticket Fulfillment", () => {
  test("fulfills a successful Stripe Battle Ticket checkout with fake adapters", async () => {
    const fake = createFakeDependencies();
    const fulfillStripeBattleTicket = createStripeBattleTicketFulfillment(
      fake.dependencies
    );

    const result = await fulfillStripeBattleTicket({
      event: checkoutEvent,
      session: createSession(),
    });

    expect(result.kind).toBe("created");
    expect(result.battleTicketId).toBe("battle_created");
    expect(result.delivery.mailSent).toBe(true);
    expect(result.delivery.status).toBe("sent");
    expect(result.delivery.battleTicket.delivery_status).toBe("handed_off");
    expect(fake.createBattleTicketRequests).toEqual([
      {
        battleTicketId: "battle_created",
        createdAt: fake.createdAt,
        customer: {
          email: "battle@example.com",
          instagram: "battle_artist",
          name: "Battle Artist",
          phone: "+48123123123",
        },
        stripeSessionId: "cs_test_battle",
      },
    ]);
    expect(fake.deliveryCalls).toEqual([makeBattleTicket()]);
  });

  test("keeps Battle Ticket Delivery failure best-effort after the record exists", async () => {
    const fake = createFakeDependencies({
      deliveryResult: failedDelivery,
    });
    const fulfillStripeBattleTicket = createStripeBattleTicketFulfillment(
      fake.dependencies
    );

    const result = await fulfillStripeBattleTicket({
      event: checkoutEvent,
      session: createSession(),
    });

    expect(result.kind).toBe("created");
    expect(result.delivery.mailError).toBe("Provider down");
    expect(result.delivery.mailSent).toBe(false);
    expect(result.delivery.status).toBe("failed");
    expect(result.delivery.battleTicket.delivery_status).toBe("pending");
    expect(fake.battleTicketsBySession.has("cs_test_battle")).toBe(true);
    expect(fake.deliveryCalls).toEqual([makeBattleTicket()]);
  });

  test("does not create or resend when a retry finds a handed-off Battle Ticket", async () => {
    const existingBattleTicket = makeBattleTicket({
      id: "battle_existing",
      mail_sent: true,
    });
    const fake = createFakeDependencies({
      initialBattleTickets: [existingBattleTicket],
    });
    const fulfillStripeBattleTicket = createStripeBattleTicketFulfillment(
      fake.dependencies
    );

    const result = await fulfillStripeBattleTicket({
      event: checkoutEvent,
      session: createSession(),
    });

    expect(result).toEqual({
      battleTicketId: existingBattleTicket.id,
      delivery: {
        battleTicket: existingBattleTicket,
        mailError: null,
        mailSent: true,
        status: "already_sent",
      },
      kind: "already_fulfilled",
    });
    expect(fake.createBattleTicketRequests).toEqual([]);
    expect(fake.deliveryCalls).toEqual([]);
  });
});
