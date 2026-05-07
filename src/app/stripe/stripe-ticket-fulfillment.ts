import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type Stripe from "stripe";

import { deliverTicket, type TicketDeliveryResult } from "@/app/ticket-delivery";
import {
  getTicketNetTotalMoney,
  normalizeMoneyString,
  TICKET_PRICE_BY_GRADE,
  toMoneyNumber,
  type TicketGrade,
} from "@/entities/ticket";
import { db } from "@/shared/db";
import {
  paymentInstallmentTable,
  ticketFinanceTable,
  ticketTable,
} from "@/shared/db/schema";
import { generateAndStoreQRCode } from "@/shared/email/send-email";
import { logStripe, logStripeStep } from "./log";
import {
  mapCheckoutCustomer,
  type StripeCheckoutCustomer,
} from "./map-checkout-customer";
import type { StripeLogContext, StripeLogLevel } from "./types";

export type StripeTicketFulfillmentResultKind =
  | "already_fulfilled"
  | "created";

export type StripeTicketDeliveryOutcome =
  | TicketDeliveryResult
  | {
      mailError: null;
      mailSent: true;
      status: "already_sent";
    };

export type StripeTicketFulfillmentResult = {
  delivery: StripeTicketDeliveryOutcome;
  kind: StripeTicketFulfillmentResultKind;
  ticketId: string;
};

export type StripeTicketFulfillmentTicket = {
  email: string;
  grade: string;
  id: string;
  mail_sent: boolean;
  name: string;
  qr_code: string;
  stripe_event_id: string;
  updated_grade: string | null;
};

export type CreateStripeTicketInput = {
  customer: StripeCheckoutCustomer;
  qrCodeUrl: string;
  stripeSessionId: string;
  ticketGrade: TicketGrade;
  ticketId: string;
};

export type CreateStripeTicketResult =
  | {
      kind: "already_exists";
      ticket: StripeTicketFulfillmentTicket;
    }
  | {
      kind: "created";
      ticket: StripeTicketFulfillmentTicket;
    };

export type StripeTicketStore = {
  createStripeTicket: (
    input: CreateStripeTicketInput
  ) => Promise<CreateStripeTicketResult>;
  findByStripeSessionId: (
    stripeSessionId: string
  ) => Promise<StripeTicketFulfillmentTicket | null>;
};

export type EnsureStripeTicketFinancePaymentInput = {
  paidAmount: string;
  paidAt: Date;
  processingFee: string;
  stripeSessionId: string;
  ticketId: string;
};

export type StripeTicketFinanceAdapter = {
  ensurePaidSiteTicketFinance: (
    input: EnsureStripeTicketFinancePaymentInput
  ) => Promise<void>;
};

export type StripeTicketQrCodeStore = {
  createTicketQrCode: (input: { ticketId: string }) => Promise<string>;
};

export type StripeTicketFulfillmentLogger = {
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

export type StripeTicketFulfillmentDependencies = {
  createTicketId: () => string;
  deliverTicket: (
    ticket: StripeTicketFulfillmentTicket
  ) => Promise<TicketDeliveryResult>;
  finance: StripeTicketFinanceAdapter;
  logger: StripeTicketFulfillmentLogger;
  now: () => Date;
  qrCodes: StripeTicketQrCodeStore;
  tickets: StripeTicketStore;
};

export type StripeTicketFulfillmentInput = {
  event: Pick<Stripe.Event, "id" | "type">;
  session: Stripe.Checkout.Session;
  ticketGrade: TicketGrade;
};

export type StripeTicketFinanceValues = {
  discountAmount: string;
  grossTotal: string;
  netTotal: string;
  paymentAmount: string;
  processingFee: string;
  taxAmount: string;
};

const stripeTicketSelection = {
  email: ticketTable.email,
  grade: ticketTable.grade,
  id: ticketTable.id,
  mail_sent: ticketTable.mail_sent,
  name: ticketTable.name,
  qr_code: ticketTable.qr_code,
  stripe_event_id: ticketTable.stripe_event_id,
  updated_grade: ticketTable.updated_grade,
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

function buildTicketQrCodePath(ticketId: string) {
  return `moment-qr/festival_2026/qr-code-${ticketId}.png`;
}

function buildTicketQrCodeTarget(ticketId: string) {
  return `https://dashboard.nailmoment.pl/ticket/${ticketId}`;
}

/**
 * Returns the real paid amount for the checkout.
 *
 * `amount_total` is preferred because it is the amount Stripe actually
 * collected. The grade price is only a fallback for defensive compatibility
 * with unusual or incomplete Stripe session payloads.
 */
export function getCheckoutPaidAmount(
  session: Pick<Stripe.Checkout.Session, "amount_total">,
  ticketGrade: TicketGrade
): string {
  if (
    typeof session.amount_total === "number" &&
    Number.isFinite(session.amount_total) &&
    session.amount_total >= 0
  ) {
    return normalizeMoneyString(session.amount_total / 100);
  }

  return TICKET_PRICE_BY_GRADE[ticketGrade];
}

/**
 * Estimates the default Stripe fee for dashboard reporting.
 *
 * The fee formula here is not fetched from Stripe's balance transaction API; it
 * is the app's default calculation used when creating finance rows immediately
 * from a checkout webhook.
 */
export function calculateDefaultStripeProcessingFee(amount: string) {
  const amountCents = Math.round(toMoneyNumber(amount) * 100);
  const feeCents = Math.round(amountCents * 0.015) + 100;
  return normalizeMoneyString(feeCents / 100);
}

export function buildStripeTicketFinanceValues({
  paidAmount,
  processingFee,
}: {
  paidAmount: string;
  processingFee: string;
}): StripeTicketFinanceValues {
  const grossTotal = normalizeMoneyString(paidAmount);
  const taxAmount = normalizeMoneyString(processingFee);
  const discountAmount = "0.00";
  const netTotal = getTicketNetTotalMoney({
    discount_amount: discountAmount,
    gross_total: grossTotal,
    payment_plan: "full",
    tax_amount: taxAmount,
  });

  return {
    discountAmount,
    grossTotal,
    netTotal,
    paymentAmount: grossTotal,
    processingFee: taxAmount,
    taxAmount,
  };
}

export function createStripeTicketStore(): StripeTicketStore {
  const findByStripeSessionId = async (
    stripeSessionId: string
  ): Promise<StripeTicketFulfillmentTicket | null> => {
    const [ticket] = await db
      .select(stripeTicketSelection)
      .from(ticketTable)
      .where(eq(ticketTable.stripe_event_id, stripeSessionId))
      .limit(1);

    return ticket ?? null;
  };

  return {
    async createStripeTicket(input) {
      const inserted = await db
        .insert(ticketTable)
        .values({
          email: input.customer.email,
          grade: input.ticketGrade,
          id: input.ticketId,
          instagram: input.customer.instagram,
          name: input.customer.name,
          phone: input.customer.phone,
          qr_code: input.qrCodeUrl,
          stripe_event_id: input.stripeSessionId,
        })
        .onConflictDoNothing()
        .returning(stripeTicketSelection);

      const createdTicket = inserted[0];

      if (createdTicket) {
        return {
          kind: "created",
          ticket: createdTicket,
        };
      }

      const existingTicket = await findByStripeSessionId(input.stripeSessionId);

      if (!existingTicket) {
        throw new Error(
          "Stripe Ticket insert conflicted but no existing Ticket was found."
        );
      }

      return {
        kind: "already_exists",
        ticket: existingTicket,
      };
    },
    findByStripeSessionId,
  };
}

export function createStripeTicketQrCodeStore(): StripeTicketQrCodeStore {
  return {
    createTicketQrCode: async ({ ticketId }) => {
      return generateAndStoreQRCode(
        buildTicketQrCodeTarget(ticketId),
        buildTicketQrCodePath(ticketId)
      );
    },
  };
}

export function createStripeTicketFinanceAdapter(): StripeTicketFinanceAdapter {
  return {
    async ensurePaidSiteTicketFinance(input) {
      const financeValues = buildStripeTicketFinanceValues(input);

      await db
        .insert(ticketFinanceTable)
        .values({
          discount_amount: financeValues.discountAmount,
          finance_note: "",
          gross_total: financeValues.grossTotal,
          id: nanoid(10),
          net_total: financeValues.netTotal,
          nip: "",
          payment_plan: "full",
          sale_source: "site",
          tax_amount: financeValues.taxAmount,
          ticket_id: input.ticketId,
        })
        .onConflictDoNothing({
          target: ticketFinanceTable.ticket_id,
        });

      const existingPayments = await db
        .select({ id: paymentInstallmentTable.id })
        .from(paymentInstallmentTable)
        .where(eq(paymentInstallmentTable.ticket_id, input.ticketId))
        .limit(1);

      if (existingPayments.length > 0) {
        return;
      }

      await db.insert(paymentInstallmentTable).values({
        amount: financeValues.paymentAmount,
        comment: `Stripe session ${input.stripeSessionId}`,
        id: nanoid(10),
        installment_number: 1,
        invoice_number: "",
        invoice_status: "not_sent",
        is_paid: true,
        paid_date: input.paidAt,
        payment_method: "other",
        sale_source: "site",
        ticket_id: input.ticketId,
      });
    },
  };
}

async function performTicketDelivery({
  dependencies,
  eventContext,
  ticket,
  ticketGrade,
}: {
  dependencies: StripeTicketFulfillmentDependencies;
  eventContext: StripeLogContext;
  ticket: StripeTicketFulfillmentTicket;
  ticketGrade: TicketGrade;
}): Promise<StripeTicketDeliveryOutcome> {
  if (ticket.mail_sent) {
    dependencies.logger.logStep(
      "info",
      "EMAIL",
      "Ticket Delivery already handed off",
      {
        ...eventContext,
        customerEmail: ticket.email,
        ticketGrade,
        ticketId: ticket.id,
      }
    );

    return {
      mailError: null,
      mailSent: true,
      status: "already_sent",
    };
  }

  dependencies.logger.logStep("info", "EMAIL", "Performing Ticket Delivery", {
    ...eventContext,
    customerEmail: ticket.email,
    ticketGrade,
    ticketId: ticket.id,
  });

  const delivery = await dependencies.deliverTicket(ticket);

  if (delivery.mailSent) {
    dependencies.logger.logStep("info", "EMAIL", "Ticket Delivery handed off", {
      ...eventContext,
      customerEmail: ticket.email,
      ticketGrade,
      ticketId: ticket.id,
    });
  } else {
    dependencies.logger.log("error", "Ticket Delivery failed", {
      ...eventContext,
      error: delivery.mailError,
      ticketId: ticket.id,
    });
  }

  return delivery;
}

async function ensureFinanceAndDelivery({
  dependencies,
  eventContext,
  kind,
  paidAmount,
  processingFee,
  stripeSessionId,
  ticket,
  ticketGrade,
}: {
  dependencies: StripeTicketFulfillmentDependencies;
  eventContext: StripeLogContext;
  kind: StripeTicketFulfillmentResultKind;
  paidAmount: string;
  processingFee: string;
  stripeSessionId: string;
  ticket: StripeTicketFulfillmentTicket;
  ticketGrade: TicketGrade;
}): Promise<StripeTicketFulfillmentResult> {
  dependencies.logger.logStep(
    "info",
    "FINANCE",
    "Ensuring Stripe Ticket Finance and Payment",
    {
      ...eventContext,
      amount: paidAmount,
      processingFee,
      ticketId: ticket.id,
    }
  );

  await dependencies.finance.ensurePaidSiteTicketFinance({
    paidAmount,
    paidAt: dependencies.now(),
    processingFee,
    stripeSessionId,
    ticketId: ticket.id,
  });

  const delivery = await performTicketDelivery({
    dependencies,
    eventContext,
    ticket,
    ticketGrade,
  });

  return {
    delivery,
    kind,
    ticketId: ticket.id,
  };
}

export function createStripeTicketFulfillment(
  dependencies: StripeTicketFulfillmentDependencies
) {
  return async function fulfillStripeTicketCheckoutSession({
    event,
    session,
    ticketGrade,
  }: StripeTicketFulfillmentInput): Promise<StripeTicketFulfillmentResult> {
    const stripeSessionId = session.id;
    const eventContext = getEventContext(event, stripeSessionId);
    const customer = mapCheckoutCustomer(session);
    const paidAmount = getCheckoutPaidAmount(session, ticketGrade);
    const processingFee = calculateDefaultStripeProcessingFee(paidAmount);

    dependencies.logger.logStep("info", "PROCESS", "Starting ticket fulfillment", {
      ...eventContext,
      customerEmail: customer.email,
      ticketGrade,
    });

    const existingTicket = await dependencies.tickets.findByStripeSessionId(
      stripeSessionId
    );

    if (existingTicket) {
      dependencies.logger.logStep(
        "warn",
        "DB",
        "Ticket already exists for Stripe session",
        {
          ...eventContext,
          ticketId: existingTicket.id,
        }
      );

      return ensureFinanceAndDelivery({
        dependencies,
        eventContext,
        kind: "already_fulfilled",
        paidAmount,
        processingFee,
        stripeSessionId,
        ticket: existingTicket,
        ticketGrade,
      });
    }

    const ticketId = dependencies.createTicketId();

    dependencies.logger.logStep("info", "QR", "Generating ticket QR code", {
      ...eventContext,
      ticketId,
    });

    const qrCodeUrl = await dependencies.qrCodes.createTicketQrCode({
      ticketId,
    });

    dependencies.logger.logStep("info", "QR", "Ticket QR code stored", {
      ...eventContext,
      qrCodeUrl,
      ticketId,
    });

    const created = await dependencies.tickets.createStripeTicket({
      customer,
      qrCodeUrl,
      stripeSessionId,
      ticketGrade,
      ticketId,
    });

    dependencies.logger.logStep(
      created.kind === "created" ? "info" : "warn",
      "DB",
      created.kind === "created"
        ? "Ticket created"
        : "Ticket already exists for Stripe session after insert conflict",
      {
        ...eventContext,
        qrCodeUrl: created.ticket.qr_code,
        ticketGrade,
        ticketId: created.ticket.id,
      }
    );

    return ensureFinanceAndDelivery({
      dependencies,
      eventContext,
      kind: created.kind === "created" ? "created" : "already_fulfilled",
      paidAmount,
      processingFee,
      stripeSessionId,
      ticket: created.ticket,
      ticketGrade,
    });
  };
}

export const fulfillStripeTicketCheckoutSession = createStripeTicketFulfillment({
  createTicketId: () => nanoid(10),
  deliverTicket,
  finance: createStripeTicketFinanceAdapter(),
  logger: {
    log: logStripe,
    logStep: logStripeStep,
  },
  now: () => new Date(),
  qrCodes: createStripeTicketQrCodeStore(),
  tickets: createStripeTicketStore(),
});
