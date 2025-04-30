import { extractInstagramUsername } from "@/shared/utils";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { generateAndStoreQRCode, sendEmail } from "./util";
import { db } from "@/shared/db";
import { ticketTable } from "@/shared/db/schema";
import { logtail } from "@/shared/logtail";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey || !stripeWebhookSecret) {
  const missingKeys = [
    !stripeSecretKey && "STRIPE_SECRET_KEY",
    !stripeWebhookSecret && "STRIPE_WEBHOOK_SECRET",
  ].filter(Boolean);
  const errorMessage = `Missing required Stripe environment variables: ${missingKeys.join(", ")}`;
  logtail.error(errorMessage, { missingKeys });
  throw new Error(errorMessage);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-03-31.basil",
});
const endpointSecret = stripeWebhookSecret;

export async function POST(req: Request) {
  let event: Stripe.Event | null = null;
  let stripeSessionId: string | null = null;

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logtail.warn("Stripe webhook request missing signature", {
        headers: Object.fromEntries(req.headers.entries()),
      });
      return NextResponse.json(
        { error: "Missing 'stripe-signature' header" },
        { status: 400 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

      logtail.info("Stripe webhook event constructed successfully", {
        event_id: event.id,
        event_type: event.type,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown webhook construction error";
      logtail.error("Stripe webhook signature verification failed", {
        error: errorMessage,
        signature_provided: !!signature,
      });

      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        stripeSessionId = session.id;

        logtail.info("Processing 'checkout.session.completed' event", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
        });

        const eventData = session.metadata?.event;
        const ticketGrade = session.metadata?.ticket_grade || "guest";

        if (eventData !== "nailmoment") {
          logtail.error("Invalid 'event' metadata in Stripe session", {
            event_id: event.id,
            stripe_session_id: stripeSessionId,
            expected_event_metadata: "nailmoment",
            received_event_metadata: eventData,
            metadata: session.metadata,
          });

          return NextResponse.json(
            { error: "Invalid event metadata" },
            { status: 400 }
          );
        }

        const ticketId = nanoid(7);
        const email = session.customer_details?.email || "";
        const phone = session.customer_details?.phone || "";
        const customFields = session.custom_fields || [];
        const name =
          customFields.find((field) => field.key === "name")?.text?.value || "";
        const instagramInput =
          customFields.find(
            (field) => field?.key?.toLowerCase() === "instagram"
          )?.text?.value || null;

        const instagram = instagramInput
          ? extractInstagramUsername(instagramInput)
          : null;

        logtail.info("Extracted customer details from session", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
          ticket_id: ticketId,
          email_found: !!email,
          phone_found: !!phone,
          name_provided: name !== "",
          instagram_input_provided: !!instagramInput,
          instagram_extracted: instagram,
          ticket_grade: ticketGrade,
        });

        if (!email) {
          logtail.error(
            "Customer email missing in checkout session, cannot proceed",
            {
              event_id: event.id,
              stripe_session_id: stripeSessionId,
              ticket_id: ticketId,
              customer_details: session.customer_details,
            }
          );

          return NextResponse.json(
            { error: "Customer email is missing" },
            { status: 400 }
          );
        }

        const qrCodeData = `https://dashboard.nailmoment.pl/ticket/${ticketId}`;
        const qrCodePath = `moment-qr/festival/qr-code-${ticketId}.png`;

        logtail.info("Generating and storing QR code", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
          ticket_id: ticketId,
          qr_code_data: qrCodeData,
          storage_path: qrCodePath,
        });

        const qrCodeUrl = await generateAndStoreQRCode(qrCodeData, qrCodePath);

        logtail.info("QR code generated and stored successfully", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
          ticket_id: ticketId,
          qrCodeUrl: qrCodeUrl,
        });

        const ticketRecord = {
          id: ticketId,
          stripe_event_id: stripeSessionId,
          name: name,
          email: email,
          phone: phone,
          instagram: instagram || "",
          qr_code: qrCodeUrl,
          grade: ticketGrade,
        };

        logtail.info("Attempting to insert ticket record into database", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
          ticket_id: ticketId,
          db_table: "ticketTable",
        });

        await db.insert(ticketTable).values(ticketRecord);

        logtail.info("Successfully inserted ticket record into database", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
          ticket_id: ticketId,
        });

        logtail.info("Attempting to send ticket confirmation email", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
          ticket_id: ticketId,
          ticket_grade: ticketGrade,
        });

        await sendEmail(email, name, qrCodeUrl, ticketGrade.toLowerCase());

        logtail.info("Successfully sent ticket confirmation email", {
          event_id: event.id,
          stripe_session_id: stripeSessionId,
          ticket_id: ticketId,
        });

        logtail.info(
          "Successfully processed 'checkout.session.completed' event",
          {
            event_id: event.id,
            stripe_session_id: stripeSessionId,
            ticket_id: ticketId,
          }
        );
        break;

      default:
        logtail.info(`Received unhandled Stripe event type: ${event.type}`, {
          event_id: event.id,
          event_type: event.type,
        });
    }

    logtail.info("Stripe webhook processed successfully, returning 200 OK", {
      event_id: event?.id,
      event_type: event?.type,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logtail.error("Unhandled exception during Stripe webhook processing", {
      error: errorMessage,
      stack: errorStack,
      event_id: event?.id,
      event_type: event?.type,
      stripe_session_id: stripeSessionId,
    });

    return NextResponse.json(
      { error: `Internal Server Error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
