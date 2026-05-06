import { and, eq, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type Stripe from "stripe";
import { db } from "@/shared/db";
import {
  battleTicketTable,
  paymentInstallmentTable,
  stripeWebhookEventTable,
  ticketFinanceTable,
  ticketTable,
  type StripeWebhookEvent,
} from "@/shared/db/schema";
import {
  TICKET_PRICE_BY_GRADE,
  TICKET_TYPE_LIST,
  type TicketGrade,
} from "@/entities/ticket";
import {
  generateAndStoreQRCode,
  sendBattleEmail,
  sendTicketEmail,
} from "@/shared/email/send-email";
import { logStripe, logStripeStep } from "../log";
import { mapCheckoutCustomer } from "../map-checkout-customer";
import type { StripeWebhookHandlerResult } from "../types";

/**
 * Handles Stripe's `checkout.session.completed` webhook.
 *
 * This file is the bridge between a successful Stripe checkout and the
 * operational records the dashboard needs:
 *
 * 1. Store a webhook-processing row so the same Stripe event cannot create
 *    duplicate tickets when Stripe retries the webhook.
 * 2. Validate that the checkout belongs to Nail Moment and that Stripe says it
 *    is paid.
 * 3. Decide whether this checkout creates a regular festival ticket or a
 *    battle ticket, based on Stripe metadata.
 * 4. Create the ticket record.
 * 5. For regular tickets, create matching finance and payment rows so the
 *    finance page sees site sales immediately.
 * 6. Send the customer email after the durable database records exist.
 *
 * The Stripe total path is intentionally simple:
 *
 *   Stripe `amount_total` (minor units / cents)
 *     -> `getCheckoutPaidAmount()` (major units / "0.00")
 *     -> `ticket_finance.gross_total`
 *     -> `payment_installment.amount`
 *
 * Then the app estimates Stripe's processing fee into
 * `ticket_finance.tax_amount` and stores gross minus fee as
 * `ticket_finance.net_total`. There is no discount calculation in this webhook:
 * Stripe already collected the final checkout amount, so site purchases are
 * stored with `discount_amount = 0.00`.
 *
 * Important: email sending is intentionally not part of the critical database
 * fulfillment path. If email delivery fails, the ticket/payment records remain
 * created and the webhook is treated as processed. That prevents Stripe retries
 * from creating duplicate records just because an external email provider had a
 * temporary problem.
 */

type StripeEventStatus = "failed" | "ignored" | "processed" | "processing";

/**
 * Result of interpreting the Stripe Checkout Session.
 *
 * Stripe sends the same event type for all completed Checkout Sessions, so the
 * app must inspect metadata before doing any business action. This type makes
 * the decision explicit:
 *
 * - `ticket`: a normal Nail Moment ticket checkout.
 * - `battle`: a battle registration checkout.
 * - `ignored`: a valid Stripe event that this handler should not fulfill.
 * - `invalid`: a Nail Moment-looking event with metadata we cannot safely use.
 */
type CheckoutResolution =
  | { kind: "battle" }
  | { kind: "ticket"; ticketGrade: TicketGrade }
  | {
      kind: "ignored" | "invalid";
      reason: string;
      context?: Record<string, unknown>;
    };

/**
 * Result of claiming the Stripe event for processing.
 *
 * Stripe webhooks are at-least-once delivery: the same event can be sent more
 * than once. A claim means this worker owns the event now. An ignored claim
 * means another attempt already handled it, or it is currently handling it.
 */
type StripeWebhookClaim =
  | { kind: "claimed" }
  | {
      kind: "ignored";
      reason: string;
      stripeSessionId?: string | undefined;
    };

type FulfillmentResult = "created" | "already_fulfilled";

/**
 * A webhook row left in `processing` probably means the server crashed, timed
 * out, or lost the process after claiming the event. After this window we allow
 * a later Stripe retry to reclaim the event and try again.
 */
const PROCESSING_CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * Builds the shared logging context used throughout the handler. Keeping these
 * ids on every log line makes it possible to reconstruct one webhook's path
 * through claim, resolve, DB writes, QR generation, and email sending.
 */
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

/**
 * Narrows untrusted Stripe metadata into the dashboard's known ticket grades.
 * Metadata is controlled by our checkout creation code, but webhook handlers
 * still treat it as runtime input because Stripe delivers it over the network.
 */
function isTicketGrade(value: string): value is TicketGrade {
  return TICKET_TYPE_LIST.some((grade) => grade === value);
}

/**
 * Returns the real paid amount for the checkout.
 *
 * `amount_total` is preferred because it is the amount Stripe actually
 * collected. The grade price is only a fallback for defensive compatibility
 * with unusual or incomplete Stripe session payloads.
 *
 * Returning a string in major currency units keeps this value compatible with
 * Drizzle decimal fields used by `ticket_finance` and `payment_installment`.
 */
export function getCheckoutPaidAmount(
  session: Pick<Stripe.Checkout.Session, "amount_total">,
  ticketGrade: TicketGrade,
): string {
  if (
    typeof session.amount_total === "number" &&
    Number.isFinite(session.amount_total) &&
    session.amount_total >= 0
  ) {
    return (session.amount_total / 100).toFixed(2);
  }

  return TICKET_PRICE_BY_GRADE[ticketGrade];
}

/**
 * Writes the final lifecycle status for a webhook event.
 *
 * The `stripe_webhook_event` row is both an audit trail and the idempotency
 * guard. Every terminal path should explain itself with `status_reason` or
 * `last_error`, because this table is what we inspect when a payment happened
 * in Stripe but something in the app looks suspicious.
 */
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

/**
 * Decides whether an existing webhook row can be processed again.
 *
 * Reclaiming is allowed for:
 *
 * - `failed`: the previous attempt threw before completing fulfillment.
 * - stale `processing`: the previous attempt likely died mid-flight.
 *
 * Reclaiming is not allowed for `processed` or `ignored`, because those are
 * terminal states and processing them again could create duplicate business
 * records or convert an intentionally ignored event into a ticket.
 */
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

/**
 * Claims the Stripe event before doing any fulfillment work.
 *
 * Why this exists:
 *
 * Stripe retries webhooks when the endpoint times out or returns an error, and
 * serverless functions can also run concurrently. Without a claim row, two
 * attempts for the same Stripe event could both create tickets.
 *
 * How it works:
 *
 * 1. Insert a `processing` row keyed by the Stripe event id.
 * 2. If the insert succeeds, this attempt owns the event.
 * 3. If the row already exists, inspect it.
 * 4. Retry only when the existing row is `failed` or stale `processing`.
 * 5. Otherwise ignore the webhook as a duplicate.
 */
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

  // This insert is the main idempotency lock. `onConflictDoNothing` makes the
  // database, rather than in-memory process state, decide who owns the event.
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
    // The WHERE clause repeats the expected status/staleness check so two
    // concurrent retry attempts cannot both reclaim the same event row.
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

/**
 * Turns a paid Stripe Checkout Session into a local business action.
 *
 * This is deliberately strict. The handler ignores unpaid sessions and sessions
 * that do not have `metadata.event = "nailmoment"`. For Nail Moment sessions,
 * it either recognizes a battle checkout or requires a valid `ticket_grade`.
 * Invalid metadata is treated as an operator-visible problem instead of trying
 * to guess what the customer bought.
 */
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

/**
 * Fulfills a paid battle checkout.
 *
 * Battle checkouts create records in `battle_ticket`. They do not create the
 * regular finance/payment rows because they are a different product flow from
 * festival tickets. The Stripe session id is stored on the ticket row so a
 * duplicate webhook can be recognized by the database as already fulfilled.
 */
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

  // A duplicate insert means this Stripe session already produced a battle
  // ticket. Treat that as successful fulfillment, not as an error.
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
    // The ticket exists even if we cannot send an email. Operations can fix the
    // customer email or resend manually; the webhook should not create another
    // battle ticket on retry.
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
    // Email delivery is intentionally best-effort after fulfillment. We log the
    // failure, but do not throw, because throwing would ask Stripe to retry the
    // whole webhook even though the ticket already exists.
    logStripe("error", "Battle email send failed", {
      ...getEventContext(event, stripeSessionId),
      error,
    });
  }

  return "created";
}

/**
 * Fulfills a paid regular ticket checkout.
 *
 * Regular ticket fulfillment has more side effects than battle fulfillment:
 *
 * 1. Generate and store a QR code for the customer ticket URL.
 * 2. Insert the ticket row with the QR URL and Stripe session id.
 * 3. Create finance/payment rows representing a fully paid site sale.
 * 4. Send the ticket email and mark `mail_sent` when delivery succeeds.
 *
 * The durable database records are created before the email is sent. This makes
 * the dashboard the source of truth even if the email provider fails later.
 */
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

  // The QR URL is stored on the ticket and included in the customer email, so
  // the asset must exist before we create/send the ticket.
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

  // If the Stripe session already has a ticket, the webhook is idempotently
  // complete. We do not create another QR/ticket/payment set.
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

  await ensureStripeTicketFinancePayment(ticketId, session, event, ticketGrade);

  await markStripeWebhookEvent(event.id, "processed", {
    processedAt: new Date(),
    statusReason: "ticket_created_with_payment",
  });

  if (!customer.email) {
    logStripe("error", "Email missing, ticket email not sent", {
      ...getEventContext(event, stripeSessionId),
    });
    // Missing email is an operational problem, not a reason to reverse the paid
    // ticket. The record remains visible in the dashboard for manual follow-up.
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
      ticketId,
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
    // Same principle as battle email: after the ticket and finance records
    // exist, email failure should be observable but should not re-run purchase
    // fulfillment.
    logStripe("error", "Ticket email send failed", {
      ...getEventContext(event, stripeSessionId),
      error,
    });
  }

  return "created";
}

/**
 * Creates finance records for a Stripe-paid ticket.
 *
 * A site checkout is always represented as a fully paid ticket in finance:
 *
 * - `ticket_finance.gross_total` is the amount Stripe collected.
 * - `ticket_finance.tax_amount` stores the estimated Stripe processing fee.
 * - `ticket_finance.net_total` is gross minus that estimated fee.
 * - One `payment_installment` row is inserted and marked `is_paid = true`.
 *
 * This is the place where the Stripe checkout total becomes finance-page data.
 * The same `paidAmount` is used for the finance gross total and for the payment
 * installment amount so the summary reads as fully paid immediately.
 *
 * The existing-payment guard matters for retries. If a previous attempt created
 * the payment but crashed before the webhook row was marked processed, the next
 * reclaim must not add a second installment for the same ticket.
 */
async function ensureStripeTicketFinancePayment(
  ticketId: string,
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
  ticketGrade: TicketGrade,
) {
  const stripeSessionId = session.id;
  const paidAmount = getCheckoutPaidAmount(session, ticketGrade);
  const processingFee = calculateDefaultStripeProcessingFee(paidAmount);
  const netAmount = subtractMoney(paidAmount, processingFee);
  const paidAt = new Date();

  logStripeStep("info", "FINANCE", "Ensuring Stripe ticket finance payment", {
    ...getEventContext(event, stripeSessionId),
    amount: paidAmount,
    processingFee,
    ticketId,
  });

  await db
    .insert(ticketFinanceTable)
    .values({
      discount_amount: "0.00",
      finance_note: "",
      gross_total: paidAmount,
      id: nanoid(10),
      net_total: netAmount,
      nip: "",
      payment_plan: "full",
      sale_source: "site",
      tax_amount: processingFee,
      ticket_id: ticketId,
    })
    .onConflictDoNothing({
      target: ticketFinanceTable.ticket_id,
    });

  // Finance rows can be retried safely: the ticket_finance insert is protected
  // by ticket_id, and payment insertion is skipped if any installment already
  // exists for this ticket.
  const existingPayments = await db
    .select({ id: paymentInstallmentTable.id })
    .from(paymentInstallmentTable)
    .where(eq(paymentInstallmentTable.ticket_id, ticketId))
    .limit(1);

  if (existingPayments.length > 0) {
    logStripeStep("info", "FINANCE", "Payment already exists for ticket", {
      ...getEventContext(event, stripeSessionId),
      ticketId,
    });
    return;
  }

  await db.insert(paymentInstallmentTable).values({
    amount: paidAmount,
    comment: `Stripe session ${stripeSessionId}`,
    id: nanoid(10),
    installment_number: 1,
    invoice_number: "",
    invoice_status: "not_sent",
    is_paid: true,
    paid_date: paidAt,
    payment_method: "other",
    sale_source: "site",
    ticket_id: ticketId,
  });

  logStripeStep("info", "FINANCE", "Stripe finance payment created", {
    ...getEventContext(event, stripeSessionId),
    amount: paidAmount,
    processingFee,
    ticketId,
  });
}

/**
 * Estimates the default Stripe fee for dashboard reporting.
 *
 * The fee formula here is not fetched from Stripe's balance transaction API; it
 * is the app's default calculation used when creating finance rows immediately
 * from a checkout webhook.
 */
function calculateDefaultStripeProcessingFee(amount: string) {
  const amountCents = moneyToCents(amount);
  const feeCents = Math.round(amountCents * 0.015) + 100;
  return centsToMoney(feeCents);
}

/** Subtracts money strings through integer cents to avoid float drift. */
function subtractMoney(amount: string, subtract: string) {
  return centsToMoney(Math.max(moneyToCents(amount) - moneyToCents(subtract), 0));
}

/** Converts a decimal money string such as `"199.00"` to integer cents. */
function moneyToCents(value: string) {
  return Math.round(Number.parseFloat(value || "0") * 100);
}

/** Converts integer cents back to the dashboard's `"0.00"` money format. */
function centsToMoney(value: number) {
  return (value / 100).toFixed(2);
}

/**
 * Main entry point used by the Stripe webhook route.
 *
 * Flow:
 *
 * 1. Confirm this is really `checkout.session.completed`.
 * 2. Claim the Stripe event id so retries/concurrent functions do not duplicate
 *    fulfillment.
 * 3. Resolve the session into battle ticket, regular ticket, ignored, or
 *    invalid.
 * 4. Fulfill the recognized checkout type.
 * 5. Mark ignored/processed/failed status on the webhook audit row.
 *
 * Any thrown error marks the webhook row as `failed` and is rethrown so Stripe
 * can retry. Non-critical email errors are caught inside the fulfillment
 * functions, so they do not make Stripe retry a successfully created ticket.
 */
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
