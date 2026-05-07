import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type Stripe from "stripe";
import { db } from "@/shared/db";
import {
  battleTicketTable,
  paymentInstallmentTable,
  ticketFinanceTable,
  ticketTable,
} from "@/shared/db/schema";
import {
  TICKET_PRICE_BY_GRADE,
  TICKET_TYPE_LIST,
  type TicketGrade,
} from "@/entities/ticket";
import { parseBattleTicket } from "@/entities/battle-ticket";
import { deliverBattleTicket } from "@/app/battle-ticket-delivery";
import { generateAndStoreQRCode } from "@/shared/email/send-email";
import { deliverTicket } from "@/app/ticket-delivery";
import { runStripeCheckoutFulfillmentClaimLifecycle } from "../checkout-fulfillment-claim";
import { createStripeCheckoutFulfillmentClaimStore } from "../checkout-fulfillment-claim-store";
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
 * Result of product-specific fulfillment after this worker owns the claim.
 *
 * `already_fulfilled` means the database uniqueness guards found an existing
 * Ticket or Battle Ticket for the same Stripe Checkout Session. The claim is
 * still marked processed because the customer-facing record already exists.
 */
type FulfillmentResult = "created" | "already_fulfilled";

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
    .returning();

  // A duplicate insert means this Stripe session already produced a battle
  // ticket. Treat that as successful fulfillment, not as an error.
  const createdBattleTicketRow = inserted[0];
  if (!createdBattleTicketRow) {
    logStripeStep("warn", "DB", "Battle ticket already exists for Stripe session", {
      ...getEventContext(event, stripeSessionId),
      battleTicketId,
    });
    return "already_fulfilled";
  }

  const createdBattleTicket = parseBattleTicket(createdBattleTicketRow);

  logStripeStep("info", "DB", "Battle ticket created", {
    ...getEventContext(event, stripeSessionId),
    battleTicketId: createdBattleTicket.id,
  });

  logStripeStep("info", "EMAIL", "Performing Battle Ticket Delivery", {
    ...getEventContext(event, stripeSessionId),
    battleTicketId: createdBattleTicket.id,
    customerEmail: createdBattleTicket.email,
  });

  const delivery = await deliverBattleTicket(createdBattleTicket);

  if (delivery.mailSent) {
    logStripeStep("info", "EMAIL", "Battle Ticket Delivery handed off", {
      ...getEventContext(event, stripeSessionId),
      battleTicketId: delivery.battleTicket.id,
      customerEmail: delivery.battleTicket.email,
    });
  } else {
    // Battle Ticket Delivery is intentionally best-effort after fulfillment.
    // The Battle Ticket remains durable and its status stays pending so
    // operations can follow up without making Stripe retry the whole purchase.
    logStripe("error", "Battle Ticket Delivery failed", {
      ...getEventContext(event, stripeSessionId),
      battleTicketId: delivery.battleTicket.id,
      error: delivery.mailError,
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
    return "already_fulfilled";
  }

  logStripeStep("info", "DB", "Ticket created", {
    ...getEventContext(event, stripeSessionId),
    qrCodeUrl,
    ticketGrade,
    ticketId,
  });

  await ensureStripeTicketFinancePayment(ticketId, session, event, ticketGrade);

  logStripeStep("info", "EMAIL", "Performing Ticket Delivery", {
    ...getEventContext(event, stripeSessionId),
    customerEmail: customer.email,
    ticketGrade,
    ticketId,
  });

  const delivery = await deliverTicket({
    email: customer.email,
    grade: ticketGrade,
    id: ticketId,
    name: customer.name,
    qr_code: qrCodeUrl,
    updated_grade: null,
  });

  if (delivery.mailSent) {
    logStripeStep("info", "EMAIL", "Ticket email sent", {
      ...getEventContext(event, stripeSessionId),
      customerEmail: customer.email,
      ticketGrade,
      ticketId,
    });
  } else {
    // After the ticket and finance records exist, Ticket Delivery failure should
    // be observable but should not re-run purchase fulfillment.
    logStripe("error", "Ticket email send failed", {
      ...getEventContext(event, stripeSessionId),
      error: delivery.mailError,
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

const stripeCheckoutFulfillmentClaimStore =
  createStripeCheckoutFulfillmentClaimStore();

/**
 * Main entry point used by the Stripe webhook route.
 *
 * Flow:
 *
 * 1. Confirm this is really `checkout.session.completed`.
 * 2. Run the extracted claim lifecycle so retries/concurrent functions do not
 *    duplicate fulfillment.
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

  try {
    // The extracted lifecycle owns idempotency, retry, and terminal claim
    // transitions. The callback below owns only the Stripe Checkout product
    // branch: resolve the session, create the right local record, and report a
    // normalized handler result back to the lifecycle.
    return await runStripeCheckoutFulfillmentClaimLifecycle({
      event,
      fulfillClaim: async () => {
        logStripeStep(
          "info",
          "HANDLE",
          "Processing checkout.session.completed event",
          {
            ...eventContext,
            metadata: session.metadata ?? {},
            paymentStatus: session.payment_status,
          }
        );

        const resolution = resolveCheckoutSession(session);

        if (resolution.kind === "ignored" || resolution.kind === "invalid") {
          logStripeStep(
            "warn",
            "RESOLVE",
            "Checkout session was ignored during resolution",
            {
              ...eventContext,
              ...resolution.context,
              reason: resolution.reason,
            }
          );

          return {
            kind: resolution.kind,
            context: resolution.context,
            reason: resolution.reason,
            stripeEventId: event.id,
            stripeSessionId,
          };
        }

        switch (resolution.kind) {
          case "battle": {
            logStripeStep(
              "info",
              "RESOLVE",
              "Resolved checkout session as battle ticket",
              {
                ...eventContext,
              }
            );
            const fulfillmentResult = await processBattleCheckoutSession(
              session,
              event
            );
            return {
              kind: "processed",
              reason:
                fulfillmentResult === "created"
                  ? "battle_ticket_created"
                  : "battle_ticket_already_exists",
              stripeEventId: event.id,
              stripeSessionId,
            };
          }
          case "ticket": {
            logStripeStep(
              "info",
              "RESOLVE",
              "Resolved checkout session as regular ticket",
              {
                ...eventContext,
                ticketGrade: resolution.ticketGrade,
              }
            );
            const fulfillmentResult = await processTicketCheckoutSession(
              session,
              event,
              resolution.ticketGrade
            );
            return {
              claimStatusReason:
                fulfillmentResult === "created"
                  ? "ticket_created_with_payment"
                  : "ticket_already_exists",
              kind: "processed",
              reason:
                fulfillmentResult === "created"
                  ? "ticket_created"
                  : "ticket_already_exists",
              stripeEventId: event.id,
              stripeSessionId,
            };
          }
        }
      },
      logger: logStripeStep,
      store: stripeCheckoutFulfillmentClaimStore,
      stripeSessionId,
    });
  } catch (error) {
    logStripe("error", "Checkout session processing failed", {
      ...eventContext,
      error,
    });
    throw error;
  }
}
