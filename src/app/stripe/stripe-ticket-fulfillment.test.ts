import type Stripe from "stripe";
import { describe, expect, test } from "vitest";

import type { TicketDeliveryResult } from "@/app/ticket-delivery";
import {
  buildStripeTicketFinanceValues,
  createStripeTicketFulfillment,
  type CreateStripeTicketInput,
  type EnsureStripeTicketFinancePaymentInput,
  type StripeTicketFulfillmentDependencies,
  type StripeTicketFulfillmentLogger,
  type StripeTicketFulfillmentTicket,
} from "./stripe-ticket-fulfillment";

const checkoutEvent = {
  id: "evt_ticket",
  type: "checkout.session.completed",
} satisfies Pick<Stripe.Event, "id" | "type">;

const noopLogger = {
  log: () => undefined,
  logStep: () => undefined,
} satisfies StripeTicketFulfillmentLogger;

const successfulDelivery = {
  mailError: null,
  mailSent: true,
  status: "sent",
} satisfies TicketDeliveryResult;

function createSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    amount_total: 94900,
    custom_fields: [
      {
        key: "name",
        text: {
          value: "Customer Name",
        },
        type: "text",
      },
      {
        key: "instagram",
        text: {
          value: "@customer",
        },
        type: "text",
      },
    ],
    customer_details: {
      address: null,
      email: "customer@example.com",
      name: null,
      phone: "+48123123123",
      tax_exempt: "none",
      tax_ids: [],
    },
    customer_email: null,
    id: "cs_test_ticket",
    metadata: {
      event: "nailmoment",
      ticket_grade: "vip",
    },
    payment_status: "paid",
    ...overrides,
  } as Stripe.Checkout.Session;
}

function makeTicket(
  overrides: Partial<StripeTicketFulfillmentTicket> = {}
): StripeTicketFulfillmentTicket {
  return {
    email: "customer@example.com",
    grade: "vip",
    id: "ticket_created",
    mail_sent: false,
    name: "Customer Name",
    qr_code: "https://blob.example/ticket_created.png",
    stripe_event_id: "cs_test_ticket",
    updated_grade: null,
    ...overrides,
  };
}

function createFakeDependencies({
  deliveryResult = successfulDelivery,
  initialTickets = [],
}: {
  deliveryResult?: TicketDeliveryResult;
  initialTickets?: StripeTicketFulfillmentTicket[];
} = {}) {
  const paidAt = new Date("2026-01-01T12:00:00.000Z");
  const createTicketRequests: CreateStripeTicketInput[] = [];
  const deliveryCalls: StripeTicketFulfillmentTicket[] = [];
  const financeRequests: EnsureStripeTicketFinancePaymentInput[] = [];
  const qrCodeRequests: string[] = [];
  const ticketsBySession = new Map(
    initialTickets.map((ticket) => [ticket.stripe_event_id, ticket])
  );

  const dependencies = {
    createTicketId: () => "ticket_created",
    deliverTicket: async (ticket) => {
      deliveryCalls.push(ticket);
      return deliveryResult;
    },
    finance: {
      ensurePaidSiteTicketFinance: async (input) => {
        financeRequests.push(input);
      },
    },
    logger: noopLogger,
    now: () => paidAt,
    qrCodes: {
      createTicketQrCode: async ({ ticketId }) => {
        qrCodeRequests.push(ticketId);
        return `https://blob.example/${ticketId}.png`;
      },
    },
    tickets: {
      createStripeTicket: async (input) => {
        createTicketRequests.push(input);
        const existingTicket = ticketsBySession.get(input.stripeSessionId);

        if (existingTicket) {
          return {
            kind: "already_exists",
            ticket: existingTicket,
          };
        }

        const ticket = makeTicket({
          email: input.customer.email,
          grade: input.ticketGrade,
          id: input.ticketId,
          name: input.customer.name,
          qr_code: input.qrCodeUrl,
          stripe_event_id: input.stripeSessionId,
        });
        ticketsBySession.set(input.stripeSessionId, ticket);

        return {
          kind: "created",
          ticket,
        };
      },
      findByStripeSessionId: async (stripeSessionId) => {
        return ticketsBySession.get(stripeSessionId) ?? null;
      },
    },
  } satisfies StripeTicketFulfillmentDependencies;

  return {
    createTicketRequests,
    deliveryCalls,
    dependencies,
    financeRequests,
    paidAt,
    qrCodeRequests,
    ticketsBySession,
  };
}

describe("Stripe Ticket Fulfillment", () => {
  test("fulfills a successful Stripe Ticket checkout with fake adapters", async () => {
    const fake = createFakeDependencies();
    const fulfillStripeTicket = createStripeTicketFulfillment(fake.dependencies);

    const result = await fulfillStripeTicket({
      event: checkoutEvent,
      session: createSession(),
      ticketGrade: "vip",
    });

    expect(result).toEqual({
      delivery: successfulDelivery,
      kind: "created",
      ticketId: "ticket_created",
    });
    expect(fake.qrCodeRequests).toEqual(["ticket_created"]);
    expect(fake.createTicketRequests).toEqual([
      {
        customer: {
          email: "customer@example.com",
          instagram: "customer",
          name: "Customer Name",
          phone: "+48123123123",
        },
        qrCodeUrl: "https://blob.example/ticket_created.png",
        stripeSessionId: "cs_test_ticket",
        ticketGrade: "vip",
        ticketId: "ticket_created",
      },
    ]);
    expect(fake.financeRequests).toEqual([
      {
        paidAmount: "949.00",
        paidAt: fake.paidAt,
        processingFee: "15.24",
        stripeSessionId: "cs_test_ticket",
        ticketId: "ticket_created",
      },
    ]);
    expect(fake.deliveryCalls).toEqual([
      makeTicket({
        qr_code: "https://blob.example/ticket_created.png",
      }),
    ]);
  });

  test("keeps delivery failure best-effort after durable records exist", async () => {
    const failedDelivery = {
      mailError: "Provider down",
      mailSent: false,
      status: "failed",
    } satisfies TicketDeliveryResult;
    const fake = createFakeDependencies({ deliveryResult: failedDelivery });
    const fulfillStripeTicket = createStripeTicketFulfillment(fake.dependencies);

    const result = await fulfillStripeTicket({
      event: checkoutEvent,
      session: createSession(),
      ticketGrade: "vip",
    });

    expect(result).toEqual({
      delivery: failedDelivery,
      kind: "created",
      ticketId: "ticket_created",
    });
    expect(fake.financeRequests).toHaveLength(1);
    expect(fake.deliveryCalls).toEqual([
      makeTicket({
        qr_code: "https://blob.example/ticket_created.png",
      }),
    ]);
    expect(fake.ticketsBySession.get("cs_test_ticket")?.mail_sent).toBe(false);
  });

  test("does not create another Ticket QR Code when a retry finds an existing Ticket", async () => {
    const existingTicket = makeTicket({
      id: "ticket_existing",
      mail_sent: true,
      qr_code: "https://blob.example/ticket_existing.png",
    });
    const fake = createFakeDependencies({
      initialTickets: [existingTicket],
    });
    const fulfillStripeTicket = createStripeTicketFulfillment(fake.dependencies);

    const result = await fulfillStripeTicket({
      event: checkoutEvent,
      session: createSession(),
      ticketGrade: "vip",
    });

    expect(result).toEqual({
      delivery: {
        mailError: null,
        mailSent: true,
        status: "already_sent",
      },
      kind: "already_fulfilled",
      ticketId: "ticket_existing",
    });
    expect(fake.qrCodeRequests).toEqual([]);
    expect(fake.createTicketRequests).toEqual([]);
    expect(fake.deliveryCalls).toEqual([]);
    expect(fake.financeRequests).toEqual([
      {
        paidAmount: "949.00",
        paidAt: fake.paidAt,
        processingFee: "15.24",
        stripeSessionId: "cs_test_ticket",
        ticketId: "ticket_existing",
      },
    ]);
  });

  test("builds Stripe Ticket Finance values through Ticket Finance Totals", () => {
    expect(
      buildStripeTicketFinanceValues({
        paidAmount: "949.00",
        processingFee: "15.24",
      })
    ).toEqual({
      discountAmount: "0.00",
      grossTotal: "949.00",
      netTotal: "933.76",
      paymentAmount: "949.00",
      processingFee: "15.24",
      taxAmount: "15.24",
    });
  });
});
