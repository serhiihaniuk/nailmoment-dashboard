import { extractInstagramUsername } from "@/shared/utils";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/shared/db";
import {
  battleTicketTable,
  paymentInstallmentTable,
  ticketTable,
} from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { logtail } from "@/shared/logtail";
import {
  generateAndStoreQRCode,
  sendBattleEmail,
  sendTicketEmail,
} from "@/shared/email/send-email";

(["info", "warn", "error"] as const).forEach((lvl) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orig = (logtail as any)[lvl].bind(logtail);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (logtail as any)[lvl] = (
    msg: string,
    fields: Record<string, unknown> = {}
  ) => {
    if (typeof fields.stripeSessionId === "string") {
      msg = `${fields.stripeSessionId.slice(-4)} ${msg}`;
    }
    return orig(msg, fields);
  };
});

/** Stripe client pinned to a fixed version */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil",
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

/** In‑memory lock (swap to Redis for distributed) */
const inFlight = new Set<string>();

export async function POST(req: Request) {
  // 1. Guard env vars each cold‑start
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    logtail.error("Stripe env vars missing", {
      missingKeys: [
        !process.env.STRIPE_SECRET_KEY && "STRIPE_SECRET_KEY",
        !process.env.STRIPE_WEBHOOK_SECRET && "STRIPE_WEBHOOK_SECRET",
      ].filter(Boolean),
    });
    await logtail.flush();
    return NextResponse.json(
      { error: "Server mis‑configuration" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  let stripeSessionId = "";

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logtail.error("Webhook without signature", {
        headers: Object.fromEntries(req.headers.entries()),
      });
      await logtail.flush();
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      logtail.error("Signature verification failed", { err });
      await logtail.flush();
      return NextResponse.json({ error: "Bad signature" }, { status: 400 });
    }

    if (inFlight.has(event.id)) {
      await logtail.flush();
      return NextResponse.json({ received: true }, { status: 200 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        stripeSessionId = session.id;

        logtail.info("Processing Stripe event", { stripeSessionId });

        if (session.payment_status !== "paid") {
          logtail.warn("Ignoring unpaid session", { stripeSessionId });
          break;
        }

        const eventData = session.metadata?.event;
        if (eventData !== "nailmoment") {
          logtail.error(
            "Invalid 'event' metadata in Stripe session, ticket not processed",
            {
              stripeSessionId,
              expected_event_metadata: "nailmoment",
              received_event_metadata: eventData,
              metadata: session.metadata,
            }
          );
          break;
        }

        const ticketGrade = (
          session.metadata?.ticket_grade || ""
        ).toLowerCase();

        const isBattleTicket = session.metadata?.type === "battle";

        if (isBattleTicket) {
          logtail.info("Processing Stripe event, battle ticket", {
            stripeSessionId,
          });

          const existing = await db
            .select()
            .from(battleTicketTable)
            .where(eq(battleTicketTable.stripe_event_id, stripeSessionId));

          if (existing.length) {
            logtail.info("Battle ticket already recorded", { stripeSessionId });
            break;
          }

          inFlight.add(event.id);

          const battleTicketId = nanoid(10);
          const email = session.customer_details?.email || "";
          if (!email) {
            logtail.error("Email missing TICKET NOT SENT", { stripeSessionId });
          }

          const phone = session.customer_details?.phone ?? "";
          const name =
            session.custom_fields?.find(
              (f) => f.key === "name" || f.key.toLowerCase() === "full name"
            )?.text?.value ?? "not found";
          const instagramInput =
            session.custom_fields?.find(
              (f) => f.key.toLowerCase() === "instagram"
            )?.text?.value ?? null;
          const instagram = instagramInput
            ? extractInstagramUsername(instagramInput)
            : "";

          await db.insert(battleTicketTable).values({
            id: battleTicketId,
            stripe_event_id: stripeSessionId,
            name,
            email,
            phone,
            instagram,
            nomination_quantity: 1,
            date: new Date(),
            archived: false,
            mail_sent: false,
            comment: "",
          });

          if (email) {
            try {
              await sendBattleEmail(email, name, battleTicketId);
              logtail.info("E‑mail sent successfully", { stripeSessionId });

              await db
                .update(battleTicketTable)
                .set({ mail_sent: true })
                .where(eq(battleTicketTable.id, battleTicketId));
              logtail.info("Battle ticket marked as sent", { stripeSessionId });
            } catch (mailErr) {
              logtail.error("E‑mail send failed", { stripeSessionId, mailErr });
            }
          }

          logtail.info("Battle ticket successfully processed", {
            stripeSessionId,
          });
          break;
        }

        // PROCESS TICKET
        if (!["guest", "standard", "vip"].includes(ticketGrade)) {
          logtail.error(
            "Invalid 'ticketGrade' metadata in Stripe session, ticket not processed",
            {
              stripeSessionId,
              expected_event_metadata: "nailmoment",
              received_event_metadata: ticketGrade,
              metadata: session.metadata,
            }
          );
          break;
        }

        if (["guest", "standard", "vip"].includes(ticketGrade)) {
          const existing = await db
            .select()
            .from(ticketTable)
            .where(eq(ticketTable.stripe_event_id, stripeSessionId));

          if (existing.length) {
            logtail.info("Ticket already recorded", { stripeSessionId });
            break;
          }

          inFlight.add(event.id);

          const ticketId = nanoid(10);
          const email = session.customer_details?.email || "";
          if (!email) {
            logtail.error("Email missing TICKET NOT SENT", { stripeSessionId });
          }

          const phone = session.customer_details?.phone ?? "";
          const name =
            session.custom_fields?.find(
              (f) => f.key === "name" || f.key.toLowerCase() === "full name"
            )?.text?.value ?? "not found";
          const instagramInput =
            session.custom_fields?.find(
              (f) => f.key.toLowerCase() === "instagram"
            )?.text?.value ?? null;
          const instagram = instagramInput
            ? extractInstagramUsername(instagramInput)
            : "";

          const qrCodeUrl = await generateAndStoreQRCode(
            `https://dashboard.nailmoment.pl/ticket/${ticketId}`,
            `moment-qr/festival/qr-code-${ticketId}.png`
          );

          await db.insert(ticketTable).values({
            id: ticketId,
            stripe_event_id: stripeSessionId,
            name,
            email,
            phone,
            instagram,
            qr_code: qrCodeUrl,
            grade: ticketGrade,
          });

          if (email) {
            try {
              await sendTicketEmail(email, name, qrCodeUrl, ticketGrade);
              logtail.info("E‑mail sent successfully", { stripeSessionId });

              await db
                .update(ticketTable)
                .set({ mail_sent: true })
                .where(eq(ticketTable.id, ticketId));
              logtail.info("Ticket marked as sent", { stripeSessionId });
            } catch (mailErr) {
              logtail.error("E‑mail send failed", { stripeSessionId, mailErr });
            }
          }

          const paymentInstallmentId = nanoid(10);
          const currentDate = new Date();

          const amountPaid = (session.amount_total || 0) / 100;

          await db.insert(paymentInstallmentTable).values({
            id: paymentInstallmentId,
            ticket_id: ticketId,
            amount: String(amountPaid),
            due_date: currentDate,
            is_paid: true,
            paid_date: currentDate,
            invoice_requested: false,
            invoice_sent: false,
          });
          logtail.info("Ticket successfully processed", { stripeSessionId });
          break;
        }
      }
      default:
        logtail.warn("Unhandled Stripe event", { type: event.type });
    }

    await logtail.flush();
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    logtail.error("Webhook processing failed", { err, stripeSessionId });
    await logtail.flush();
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    // @ts-expect-error: Variable 'event' is used before being assigned
    if (event?.id) inFlight.delete(event.id);
  }
}
