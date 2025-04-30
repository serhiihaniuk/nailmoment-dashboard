import { extractInstagramUsername } from "@/shared/utils";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { generateAndStoreQRCode, sendEmail } from "./util";
import { db } from "@/shared/db";
import { ticketTable } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { logtail } from "@/shared/logtail";

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
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      logtail.error("Signature verification failed", { err });
      return NextResponse.json({ error: "Bad signature" }, { status: 400 });
    }

    if (inFlight.has(event.id)) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        stripeSessionId = session.id;

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
          session.custom_fields?.find((f) => f.key === "name")?.text?.value ??
          "not found";
        const instagramInput =
          session.custom_fields?.find(
            (f) => f.key.toLowerCase() === "instagram"
          )?.text?.value ?? null;
        const instagram = instagramInput
          ? extractInstagramUsername(instagramInput)
          : "";
        const ticketGrade = (
          session.metadata?.ticket_grade ?? "guest"
        ).toLowerCase();

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
            await sendEmail(email, name, qrCodeUrl, ticketGrade);
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
        logtail.info("Ticket successfully processed", { stripeSessionId });
        break;
      }
      default:
        logtail.warn("Unhandled Stripe event", { type: event.type });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    logtail.error("Webhook processing failed", { err, stripeSessionId });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    // @ts-expect-error: Variable 'event' is used before being assigned
    if (event?.id) inFlight.delete(event.id);
  }
}
