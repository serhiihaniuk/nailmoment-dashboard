import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type Stripe from "stripe";
import { db } from "@/shared/db";
import {
  battleTicketTable,
  stripeWebhookEventTable,
  ticketTable,
} from "@/shared/db/schema";
import { TICKET_TYPE_LIST, type TicketGrade } from "@/shared/const";
import {
  generateAndStoreQRCode,
  sendBattleEmail,
  sendTicketEmail,
} from "@/shared/email/send-email";
import { logStripe } from "../log";
import { mapCheckoutCustomer } from "../map-checkout-customer";
import type { StripeWebhookHandlerResult } from "../types";

type StripeEventStatus = "failed" | "ignored" | "processed" | "processing";

type CheckoutResolution =
  | { kind: "battle" }
  | { kind: "ticket"; ticketGrade: TicketGrade }
  | { kind: "ignored" | "invalid"; reason: string };

type StripeWebhookClaim =
  | { kind: "claimed" }
  | {
      kind: "ignored";
      reason: string;
      stripeSessionId?: string;
    };

function getEventContext(
  event: Pick<Stripe.Event, "id" | "type">,
  stripeSessionId: string,
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

async function claimStripeWebhookEvent(
  event: Stripe.Event,
): Promise<StripeWebhookClaim> {
  const stripeSessionId = isCheckoutSessionCompletedEvent(event)
    ? event.data.object.id
    : undefined;

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
    return { kind: "claimed" };
  }

  const [existing] = await db
    .select()
    .from(stripeWebhookEventTable)
    .where(eq(stripeWebhookEventTable.id, event.id))
    .limit(1);

  if (!existing) {
    return {
      kind: "ignored",
      reason: "event_claim_race_lost",
      stripeSessionId,
    };
  }

  if (existing.status === "failed") {
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
        and(
          eq(stripeWebhookEventTable.id, event.id),
          eq(stripeWebhookEventTable.status, "failed"),
        ),
      )
      .returning({ id: stripeWebhookEventTable.id });

    if (recovered.length > 0) {
      return { kind: "claimed" };
    }
  }

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
      kind: "ignored",
      reason: "unpaid_session",
    };
  }

  if (session.metadata?.event !== "nailmoment") {
    return {
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
) {
  const stripeSessionId = session.id;
  const customer = mapCheckoutCustomer(session);
  const battleTicketId = nanoid(10);

  await db.insert(battleTicketTable).values({
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
  });

  await markStripeWebhookEvent(event.id, "processed", {
    processedAt: new Date(),
    statusReason: "battle_ticket_created",
  });

  if (!customer.email) {
    logStripe("error", "Email missing, battle email not sent", {
      ...getEventContext(event, stripeSessionId),
    });
    return;
  }

  try {
    await sendBattleEmail(customer.email, customer.name, battleTicketId);
    await db
      .update(battleTicketTable)
      .set({ mail_sent: true })
      .where(eq(battleTicketTable.id, battleTicketId));
  } catch (error) {
    logStripe("error", "Battle email send failed", {
      ...getEventContext(event, stripeSessionId),
      error,
    });
  }
}

async function processTicketCheckoutSession(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
  ticketGrade: TicketGrade,
) {
  const stripeSessionId = session.id;
  const customer = mapCheckoutCustomer(session);
  const ticketId = nanoid(10);
  const qrCodeUrl = await generateAndStoreQRCode(
    `https://dashboard.nailmoment.pl/ticket/${ticketId}`,
    `moment-qr/festival_2026/qr-code-${ticketId}.png`,
  );

  await db.insert(ticketTable).values({
    email: customer.email,
    grade: ticketGrade,
    id: ticketId,
    instagram: customer.instagram,
    name: customer.name,
    phone: customer.phone,
    qr_code: qrCodeUrl,
    stripe_event_id: stripeSessionId,
  });

  await markStripeWebhookEvent(event.id, "processed", {
    processedAt: new Date(),
    statusReason: "ticket_created",
  });

  if (!customer.email) {
    logStripe("error", "Email missing, ticket email not sent", {
      ...getEventContext(event, stripeSessionId),
    });
    return;
  }

  try {
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
  } catch (error) {
    logStripe("error", "Ticket email send failed", {
      ...getEventContext(event, stripeSessionId),
      error,
    });
  }
}

export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
): Promise<StripeWebhookHandlerResult> {
  if (!isCheckoutSessionCompletedEvent(event)) {
    return {
      kind: "invalid",
      reason: "unexpected_event_type",
      stripeEventId: event.id,
    };
  }

  const session = event.data.object;
  const stripeSessionId = session.id;
  const eventContext = getEventContext(event, stripeSessionId);
  const claim = await claimStripeWebhookEvent(event);

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
    await markStripeWebhookEvent(event.id, "ignored", {
      statusReason: resolution.reason,
    });

    return {
      kind: resolution.kind,
      reason: resolution.reason,
      stripeEventId: event.id,
      stripeSessionId,
    };
  }

  try {
    switch (resolution.kind) {
      case "battle":
        await processBattleCheckoutSession(session, event);
        return {
          kind: "processed",
          reason: "battle_ticket_created",
          stripeEventId: event.id,
          stripeSessionId,
        };
      case "ticket":
        await processTicketCheckoutSession(
          session,
          event,
          resolution.ticketGrade,
        );
        return {
          kind: "processed",
          reason: "ticket_created",
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
