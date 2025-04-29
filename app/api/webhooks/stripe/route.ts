import { extractInstagramUsername } from "@/shared/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";

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
      console.log("No signature found");
      return NextResponse.json(
        { error: "No signature found" },
        { status: 400 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.log(`❌ Error message: ${err}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        const email = session.customer_details?.email || "email not found";
        const phone = session.customer_details?.phone || "phone not found";

        const customFields = session.custom_fields || [];
        const instagramInput =
          customFields.find(
            (field) => field?.key?.toLowerCase() === "instagram"
          )?.text?.value || "instagram not found";

        const instagram = extractInstagramUsername(instagramInput);
        const name =
          customFields.find((field) => field.key === "name")?.text?.value || "";
        const ticketGrade = session.metadata?.ticket_grade || "name not found";

        console.log({ email, phone, instagram, name, ticketGrade });

        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: `${error}` }, { status: 400 });
  }
}
