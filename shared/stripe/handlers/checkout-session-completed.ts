import { and, eq, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type Stripe from "stripe";
import { db } from "@/shared/db";
import {
  battleTicketTable,
  stripeWebhookEventTable,
  ticketTable,
  type StripeWebhookEvent,
} from "@/shared/db/schema";
import { TICKET_TYPE_LIST, type TicketGrade } from "@/shared/const";
import {
  generateAndStoreQRCode,
  sendBattleEmail,
  sendTicketEmail,
} from "@/shared/email/send-email";
import { logStripe, logStripeStep } from "../log";
import { mapCheckoutCustomer } from "../map-checkout-customer";
import type { StripeWebhookHandlerResult } from "../types";

type StripeEventStatus = "failed" | "ignored" | "processed" | "processing";

type CheckoutResolution =
  | { kind: "battle" }
  | { kind: "ticket"; ticketGrade: TicketGrade }
  | {
      kind: "ignored" | "invalid";
      reason: string;
      context?: Record<string, unknown>;
    };

type StripeWebhookClaim =
  | { kind: "claimed" }
  | {
      kind: "ignored";
      reason: string;
      stripeSessionId?: string;
    };

type FulfillmentResult = "created" | "already_fulfilled";

const PROCESSING_CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;

function getEventContext(
  event: Pick<Stripe.Event, "id" | "type">,
  stripeSessionId?: string,
) {
  return {
    stripeEventId: event.id,
    stripeSessionId,
    stripeEventType: event.type,
  };
}

function isCheckoutSessionCompletedEvent(
  event: Stripe.Event,
): event is Stripe.CheckoutSessionCompletedEvent {
  return event.type === "checkout.session.completed";
}

function isTicketGrade(value: string): value is TicketGrade {
  return TICKET_TYPE_LIST.some((grade) => grade === value);
}

async function markStripeWebhookEvent(
  eventId: string,
  status: StripeEventStatus,
  values: {
    lastError?: string | null;
    processedAt?: Date | null;
    statusReason?: string | null;
  } = {},
) {
  await db
    .update(stripeWebhookEventTable)
    .set({
      last_error: values.lastError ?? null,
      processed_at: values.processedAt ?? null,
      status,
      status_reason: values.statusReason ?? null,
      updated_at: new Date(),
    })
    .where(eq(stripeWebhookEventTable.id, eventId));
}

export function shouldReclaimStripeWebhookEvent(
  event: Pick<StripeWebhookEvent, "status" | "updated_at">,
  now: Date = new Date(),
): boolean {
  if (event.status === "failed") {
    return true;
  }

  if (event.status !== "processing") {
    return false;
  }

  const staleBefore = new Date(now.getTime() - PROCESSING_CLAIM_STALE_AFTER_MS);
  return event.updated_at <= staleBefore;
}

async function claimStripeWebhookEvent(
  event: Stripe.Event,
): Promise<StripeWebhookClaim> {
  const stripeSessionId = isCheckoutSessionCompletedEvent(event)
    ? event.data.object.id
    : undefined;
  const eventContext = getEventContext(event, stripeSessionId);

  logStripeStep("info", "CLAIM", "Attempting to claim Stripe webhook event", {
    ...eventContext,
  });

  const inserted = await db
    .insert(stripeWebhookEventTable)
    .values({
      attempt_count: 1,
      id: event.id,
      status: "processing",
      stripe_session_id: stripeSessionId,
      type: event.type,
    })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEventTable.id });

  if (inserted.length > 0) {
    logStripeStep("info", "CLAIM", "Claimed new Stripe webhook event row", {
      ...eventContext,
    });
    return { kind: "claimed" };
  }

  const [existing] = await db
    .select()
    .from(stripeWebhookEventTable)
    .where(eq(stripeWebhookEventTable.id, event.id))
    .limit(1);

  if (!existing) {
    logStripeStep("warn", "CLAIM", "Stripe webhook claim race lost", {
      ...eventContext,
      reason: "event_claim_race_lost",
    });
    return {
      kind: "ignored",
      reason: "event_claim_race_lost",
      stripeSessionId,
    };
  }

  const now = new Date();
  if (shouldReclaimStripeWebhookEvent(existing, now)) {
    logStripeStep("warn", "CLAIM", "Found stale Stripe webhook row, attempting reclaim", {
      ...eventContext,
      existingStatus: existing.status,
      existingUpdatedAt: existing.updated_at,
    });

    const staleBefore = new Date(
      now.getTime() - PROCESSING_CLAIM_STALE_AFTER_MS,
    );
    const recovered = await db
      .update(stripeWebhookEventTable)
      .set({
        attempt_count: sql`${stripeWebhookEventTable.attempt_count} + 1`,
        last_error: null,
        status: "processing",
        status_reason: null,
        updated_at: new Date(),
      })
      .where(
        existing.status === "failed"
          ? and(
              eq(stripeWebhookEventTable.id, event.id),
              eq(stripeWebhookEventTable.status, "failed"),
            )
          : and(
              eq(stripeWebhookEventTable.id, event.id),
              eq(stripeWebhookEventTable.status, "processing"),
              lte(stripeWebhookEventTable.updated_at, staleBefore),
            ),
      )
      .returning({ id: stripeWebhookEventTable.id });

    if (recovered.length > 0) {
      logStripeStep("info", "CLAIM", "Reclaimed stale Stripe webhook row", {
        ...eventContext,
        previousStatus: existing.status,
      });
      return { kind: "claimed" };
    }
  }

  logStripeStep("warn", "CLAIM", "Stripe webhook event already handled", {
    ...eventContext,
    existingStatus: existing.status,
    reason: `duplicate_${existing.status}`,
  });

  return {
    kind: "ignored",
    reason: `duplicate_${existing.status}`,
    stripeSessionId: existing.stripe_session_id ?? stripeSessionId,
  };
}

export function resolveCheckoutSession(
  session: Stripe.Checkout.Session,
): CheckoutResolution {
  if (session.payment_status !== "paid") {
    return {
      context: {
        expectedPaymentStatus: "paid",
        metadata: session.metadata ?? {},
        receivedPaymentStatus: session.payment_status,
      },
      kind: "ignored",
      reason: "unpaid_session",
    };
  }

  if (session.metadata?.event !== "nailmoment") {
    return {
      context: {
        expectedEventMetadata: "nailmoment",
        metadata: session.metadata ?? {},
        receivedEventMetadata: session.metadata?.event ?? null,
      },
      kind: "ignored",
      reason: "unexpected_event_metadata",
    };
  }

  if (session.metadata?.type === "battle") {
    return { kind: "battle" };
  }

  const ticketGrade = (session.metadata?.ticket_grade ?? "").toLowerCase();

  if (!isTicketGrade(ticketGrade)) {
    return {
      context: {
        allowedTicketGrades: TICKET_TYPE_LIST,
        metadata: session.metadata ?? {},
        receivedTicketGrade: session.metadata?.ticket_grade ?? null,
      },
      kind: "invalid",
      reason: "invalid_ticket_grade",
    };
  }

  return {
    kind: "ticket",
    ticketGrade,
  };
}

async function processBattleCheckoutSession(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
): Promise<FulfillmentResult> {
  const stripeSessionId = session.id;
  const customer = mapCheckoutCustomer(session);
  const battleTicketId = nanoid(10);

  logStripeStep("info", "PROCESS", "Starting battle ticket fulfillment", {
    ...getEventContext(event, stripeSessionId),
    customerEmail: customer.email,
  });

  const inserted = await db
    .insert(battleTicketTable)
    .values({
      archived: false,
      comment: "",
      date: new Date(),
      email: customer.email,
      id: battleTicketId,
      instagram: customer.instagram,
      mail_sent: false,
      name: customer.name,
      nomination_quantity: 1,
      phone: customer.phone,
      stripe_event_id: stripeSessionId,
    })
    .onConflictDoNothing()
    .returning({ id: battleTicketTable.id });

  if (inserted.length === 0) {
    logStripeStep("warn", "DB", "Battle ticket already exists for Stripe session", {
      ...getEventContext(event, stripeSessionId),
      battleTicketId,
    });
    await markStripeWebhookEvent(event.id, "processed", {
      processedAt: new Date(),
      statusReason: "battle_ticket_already_exists",
    });
    return "already_fulfilled";
  }

  logStripeStep("info", "DB", "Battle ticket created", {
    ...getEventContext(event, stripeSessionId),
    battleTicketId,
  });

  await markStripeWebhookEvent(event.id, "processed", {
    processedAt: new Date(),
    statusReason: "battle_ticket_created",
  });

  if (!customer.email) {
    logStripe("error", "Email missing, battle email not sent", {
      ...getEventContext(event, stripeSessionId),
    });
    return "created";
  }

  try {
    logStripeStep("info", "EMAIL", "Sending battle ticket email", {
      ...getEventContext(event, stripeSessionId),
      battleTicketId,
      customerEmail: customer.email,
    });
    await sendBattleEmail(customer.email, customer.name, battleTicketId);
    await db
      .update(battleTicketTable)
      .set({ mail_sent: true })
      .where(eq(battleTicketTable.id, battleTicketId));
    logStripeStep("info", "EMAIL", "Battle ticket email sent", {
      ...getEventContext(event, stripeSessionId),
      battleTicketId,
      customerEmail: customer.email,
    });
  } catch (error) {
    logStripe("error", "Battle email send failed", {
      ...getEventContext(event, stripeSessionId),
      error,
    });
  }

  return "created";
}

async function processTicketCheckoutSession(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
  ticketGrade: TicketGrade,
): Promise<FulfillmentResult> {
  const stripeSessionId = session.id;
  const customer = mapCheckoutCustomer(session);
  const ticketId = nanoid(10);

  logStripeStep("info", "PROCESS", "Starting ticket fulfillment", {
    ...getEventContext(event, stripeSessionId),
    customerEmail: customer.email,
    ticketGrade,
  });

  logStripeStep("info", "QR", "Generating ticket QR code", {
    ...getEventContext(event, stripeSessionId),
    ticketId,
  });

  const qrCodeUrl = await generateAndStoreQRCode(
    `https://dashboard.nailmoment.pl/ticket/${ticketId}`,
    `moment-qr/festival_2026/qr-code-${ticketId}.png`,
  );

  logStripeStep("info", "QR", "Ticket QR code stored", {
    ...getEventContext(event, stripeSessionId),
    qrCodeUrl,
    ticketId,
  });

  const inserted = await db
    .insert(ticketTable)
    .values({
      email: customer.email,
      grade: ticketGrade,
      id: ticketId,
      instagram: customer.instagram,
      name: customer.name,
      phone: customer.phone,
      qr_code: qrCodeUrl,
      stripe_event_id: stripeSessionId,
    })
    .onConflictDoNothing()
    .returning({ id: ticketTable.id });

  if (inserted.length === 0) {
    logStripeStep("warn", "DB", "Ticket already exists for Stripe session", {
      ...getEventContext(event, stripeSessionId),
      ticketId,
    });
    await markStripeWebhookEvent(event.id, "processed", {
      processedAt: new Date(),
      statusReason: "ticket_already_exists",
    });
    return "already_fulfilled";
  }

  logStripeStep("info", "DB", "Ticket created", {
    ...getEventContext(event, stripeSessionId),
    qrCodeUrl,
    ticketGrade,
    ticketId,
  });

  await markStripeWebhookEvent(event.id, "processed", {
    processedAt: new Date(),
    statusReason: "ticket_created",
  });

  if (!customer.email) {
    logStripe("error", "Email missing, ticket email not sent", {
      ...getEventContext(event, stripeSessionId),
    });
    return "created";
  }

  try {
    logStripeStep("info", "EMAIL", "Sending ticket email", {
      ...getEventContext(event, stripeSessionId),
      customerEmail: customer.email,
      ticketGrade,
      ticketId,
    });
    await sendTicketEmail(
      customer.email,
      customer.name,
      qrCodeUrl,
      ticketGrade,
    );
    await db
      .update(ticketTable)
      .set({ mail_sent: true })
      .where(eq(ticketTable.id, ticketId));
    logStripeStep("info", "EMAIL", "Ticket email sent", {
      ...getEventContext(event, stripeSessionId),
      customerEmail: customer.email,
      ticketGrade,
      ticketId,
    });
  } catch (error) {
    logStripe("error", "Ticket email send failed", {
      ...getEventContext(event, stripeSessionId),
      error,
    });
  }

  return "created";
}

export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
): Promise<StripeWebhookHandlerResult> {
  if (!isCheckoutSessionCompletedEvent(event)) {
    return {
      context: {
        expectedEventType: "checkout.session.completed",
        receivedEventType: event.type,
      },
      kind: "invalid",
      reason: "unexpected_event_type",
      stripeEventId: event.id,
    };
  }

  const session = event.data.object;
  const stripeSessionId = session.id;
  const eventContext = getEventContext(event, stripeSessionId);
  const claim = await claimStripeWebhookEvent(event);

  logStripeStep("info", "HANDLE", "Processing checkout.session.completed event", {
    ...eventContext,
    metadata: session.metadata ?? {},
    paymentStatus: session.payment_status,
  });

  if (claim.kind === "ignored") {
    return {
      kind: "ignored",
      reason: claim.reason,
      stripeEventId: event.id,
      stripeSessionId: claim.stripeSessionId,
    };
  }

  const resolution = resolveCheckoutSession(session);

  if (resolution.kind === "ignored" || resolution.kind === "invalid") {
    logStripeStep("warn", "RESOLVE", "Checkout session was ignored during resolution", {
      ...eventContext,
      ...resolution.context,
      reason: resolution.reason,
    });

    await markStripeWebhookEvent(event.id, "ignored", {
      statusReason: resolution.reason,
    });

    return {
      kind: resolution.kind,
      context: resolution.context,
      reason: resolution.reason,
      stripeEventId: event.id,
      stripeSessionId,
    };
  }

  try {
    switch (resolution.kind) {
      case "battle":
        logStripeStep("info", "RESOLVE", "Resolved checkout session as battle ticket", {
          ...eventContext,
        });
        return {
          kind: "processed",
          reason:
            (await processBattleCheckoutSession(session, event)) === "created"
              ? "battle_ticket_created"
              : "battle_ticket_already_exists",
          stripeEventId: event.id,
          stripeSessionId,
        };
      case "ticket":
        logStripeStep("info", "RESOLVE", "Resolved checkout session as regular ticket", {
          ...eventContext,
          ticketGrade: resolution.ticketGrade,
        });
        return {
          kind: "processed",
          reason:
            (
              await processTicketCheckoutSession(
                session,
                event,
                resolution.ticketGrade
              )
            ) === "created"
              ? "ticket_created"
              : "ticket_already_exists",
          stripeEventId: event.id,
          stripeSessionId,
        };
    }
  } catch (error) {
    await markStripeWebhookEvent(event.id, "failed", {
      lastError: error instanceof Error ? error.message : String(error),
    });
    logStripe("error", "Checkout session processing failed", {
      ...eventContext,
      error,
    });
    throw error;
  }
}
