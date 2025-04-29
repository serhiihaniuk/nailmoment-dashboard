import { extractInstagramUsername } from "@/shared/utils";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { generateAndStoreQRCode, sendEmail } from "./util";
import { db } from "@/shared/db";
import { ticketTable } from "@/shared/db/schema";
import { logtail } from "@/shared/logtail";

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing Stripe secret key");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const requestHeaders = new Headers(req.headers);
    const signature = requestHeaders.get("stripe-signature");

    let event: Stripe.Event;

    if (!signature) {
      logtail.error("No signature found", { body });
      return NextResponse.json(
        { error: "No signature found" },
        { status: 400 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.log(`❌ Error message: ${err}`);
      logtail.error(`Webhook Error: ${err}`, { body });
      return NextResponse.json(
        { error: `Webhook Error: ${err}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        /**
         * stripe payment link should have 2 metadata fields:
         * event: nailmoment
         * ticket_grade: guest | standard | vip;
         */
        const eventData = session.metadata?.event;

        if (eventData !== "nailmoment") {
          logtail.error("Invalid event data", {
            stripe_id: session.id,
            event_data: eventData,
          });

          return NextResponse.json(
            { error: "Invalid event data" },
            { status: 400 }
          );
        }

        const id = nanoid(7);
        const email = session.customer_details?.email || "email not found";
        const phone = session.customer_details?.phone || "phone not found";

        const customFields = session.custom_fields || [];
        const instagramInput =
          customFields.find(
            (field) => field?.key?.toLowerCase() === "instagram"
          )?.text?.value || "instagram not found";
        const ticketGrade = session.metadata?.ticket_grade || "guest";

        const instagram = extractInstagramUsername(instagramInput);
        const name =
          customFields.find((field) => field.key === "name")?.text?.value || "";

        const qrCodeUrl = await generateAndStoreQRCode(
          `https://dashboard.nailmoment.pl/ticket/${id}`,
          `moment-qr/test/qr-code-${id}.png`
        );

        logtail.info("Trying to insert ticket", { stripe_id: session.id });

        await db.insert(ticketTable).values({
          id,
          stripe_event_id: session.id,
          name,
          email,
          phone,
          instagram,
          qr_code: qrCodeUrl,
          grade: ticketGrade,
        });

        await sendEmail(email, name, qrCodeUrl, ticketGrade.toLowerCase());

        break;
      default:
        logtail.info(`Unhandled event type ${event.type}`, {
          stripe_event: event,
        });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logtail.error("unexpected error", { error });
    return NextResponse.json({ error: `${error}` }, { status: 400 });
  }
}
