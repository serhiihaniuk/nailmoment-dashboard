# Stripe Flow

Stripe enters the app through `POST /api/webhooks/stripe`.

This flow is intentionally separate from normal authenticated dashboard routes:
Stripe requests are authenticated by signature verification, not by Better Auth
session cookies.

## Main Files

| Concern | Files |
| --- | --- |
| Public Next route shim | `app/api/webhooks/stripe/route.ts` |
| Route composition | `src/app/api-routes/webhooks/stripe/route.ts` |
| Generic route handler | `src/app/stripe/route-handler.ts` |
| Signature/config/session verification | `src/app/stripe/verify-webhook.ts` |
| Checkout fulfillment | `src/app/stripe/handlers/checkout-session-completed.ts` |
| Stripe Ticket fulfillment adapter | `src/app/stripe/stripe-ticket-fulfillment.ts` |
| Stripe Battle Ticket fulfillment adapter | `src/app/stripe/stripe-battle-ticket-fulfillment.ts` |
| Checkout claim lifecycle | `src/app/stripe/checkout-fulfillment-claim.ts` |
| Checkout claim DB adapter | `src/app/stripe/checkout-fulfillment-claim-store.ts` |
| Ticket Delivery orchestration | `src/app/ticket-delivery/*` |
| Battle Ticket Delivery orchestration | `src/app/battle-ticket-delivery/*` |
| Customer mapper | `src/app/stripe/map-checkout-customer.ts` |
| Logging | `src/app/stripe/log.ts` |
| Shared result types | `src/app/stripe/types.ts` |
| Webhook audit table | `src/shared/db/schema.ts` (`stripeWebhookEventTable`) |
| Webhook table migration | `drizzle/0014_stripe_webhook_events.sql` |
| Ticket/battle uniqueness migration | `drizzle/0015_stripe_fulfillment_uniques.sql` |

## Entry Flow

```txt
Stripe
  |
  v
POST /api/webhooks/stripe
  |
  v
app/api/webhooks/stripe/route.ts
  |
  v
src/app/api-routes/webhooks/stripe/route.ts
  |
  +- verifyStripeWebhookRequest
  +- createStripeWebhookRoute
  +- handleCheckoutSessionCompleted
```

## Verification Flow

```txt
verifyStripeWebhookRequest(request)
  |
  +- read Stripe env config
  |    +- STRIPE_SECRET_KEY
  |    +- STRIPE_WEBHOOK_SECRET
  |    +- optional allow-list guards
  |
  +- require stripe-signature header
  |
  +- request.text()
  |
  +- stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  |
  +- if checkout.session.completed:
       +- validate mode = payment
       +- validate expected livemode
       +- validate allowed currencies if configured
       +- validate allowed price ids if configured
```

Important:

```txt
Do not call request.json() before Stripe signature verification.
```

Stripe signs the exact raw body string.

## Route Handler Flow

```txt
createStripeWebhookRoute()
  |
  +- log RECEIVED
  +- verify request
  +- if rejected:
  |    return verifier-chosen status/body
  |
  +- find handler for event.type
  +- no handler:
  |    log and return 200 { received: true }
  |
  +- run handler
  +- log normalized handler result
  +- return 200 { received: true }
  |
  +- catch unexpected error:
       return 500 so Stripe retries
  |
  +- finally:
       waitUntil(flushStripeLogs())
```

Some verifier rejections return 200. That means the request was understood but
intentionally not fulfillable by this app, so Stripe should not retry.

## Checkout Fulfillment Flow

```txt
handleCheckoutSessionCompleted(event)
  |
  +- confirm event.type is checkout.session.completed
  |
  +- runStripeCheckoutFulfillmentClaimLifecycle
  |    |
  |    +- claim stripe_webhook_event row by event.id
  |    |
  |    +- inserted -> current worker owns event
  |    +- existing failed -> reclaim
  |    +- existing stale processing -> reclaim
  |    +- existing processed/ignored/fresh processing -> duplicate ignored
  |
  +- resolve checkout session
  |    |
  |    +- unpaid -> ignored
  |    +- metadata.event != nailmoment -> ignored
  |    +- metadata.type == battle -> battle branch
  |    +- valid metadata.ticket_grade -> ticket branch
  |    +- invalid grade -> invalid
  |
  +- process branch
  |
  +- mark webhook processed/ignored/failed
```

## Idempotency

There are three layers:

1. `stripe_webhook_event.id` is the Stripe event id primary key.
2. `ticket.stripe_event_id` is unique.
3. `battle_ticket.stripe_event_id` is unique.

The webhook row prevents duplicate processing of the same event. The ticket and
battle unique constraints are the final DB-level guard against duplicate local
records for the same Checkout Session.

Webhook status lifecycle:

```txt
processing -> processed
processing -> ignored
processing -> failed
failed     -> processing   on retry/reclaim
stale processing -> processing on retry/reclaim
```

## Regular Ticket Branch

```txt
processTicketCheckoutSession(session, event, ticketGrade)
  |
  +- map customer fields
  +- check for an existing Ticket by Stripe Checkout Session id
  |    +- existing -> ensure finance/payment, skip QR creation, deliver only if needed
  +- create local ticket id
  +- generate QR code for https://dashboard.nailmoment.pl/ticket/<id>
  +- upload QR to Vercel Blob
  +- insert ticket with stripe_event_id = session.id
  +- ensure paid site Ticket Finance and Payment through the finance adapter
  +- mark webhook processed
  +- ask Ticket Delivery to perform customer email handoff best-effort
```

The handler keeps the webhook route seam and claim lifecycle intact. Regular
Stripe Ticket work runs through `stripe-ticket-fulfillment.ts`, whose adapters
make the ticket store, Ticket Finance, QR storage, and Ticket Delivery behavior
testable with fakes.

Ticket Delivery failure is logged but does not throw after ticket/payment
records exist. That prevents Stripe retries from duplicating fulfillment.

## Battle Branch

```txt
fulfillStripeBattleTicketCheckoutSession({ session, event })
  |
  +- map customer fields
  +- find existing Battle Ticket by Stripe Checkout Session id
  |    +- existing -> skip creation and delivery if already handed off
  +- create local Battle Ticket id
  +- insert battle_ticket with stripe_event_id = session.id
  +- parse the durable row through the Battle Ticket entity surface
  +- ask Battle Ticket Delivery to perform customer email handoff best-effort
  +- complete webhook as processed after durable Battle Ticket exists
```

Battle checkouts do not create regular `ticket_finance` or
`payment_installment` rows.

Battle Ticket fulfillment runs through `stripe-battle-ticket-fulfillment.ts`,
whose Battle Ticket store and Battle Ticket Delivery dependencies can be tested
with fake adapters. Battle Ticket Delivery failure is logged but does not throw
after the Battle Ticket exists; the delivery status remains pending for
operator follow-up.

## Total Mapping

Stripe sends checkout totals in minor units:

```txt
amount_total = 19900
```

The app maps it like this:

```txt
Stripe Checkout Session amount_total
  |
  v
getCheckoutPaidAmount()
  |
  +- amount_total / 100 -> "199.00"
  +- fallback to TICKET_PRICE_BY_GRADE only if amount_total is absent/invalid
  |
  v
paidAmount
  |
  +- ticket_finance.gross_total = paidAmount
  +- payment_installment.amount = paidAmount
  +- payment_installment.is_paid = true
```

Fee/net mapping:

```txt
paidAmount
  |
  +- calculateDefaultStripeProcessingFee(amount)
  |    -> round(amount * 1.5%) + 1.00
  |
  +- ticket_finance.tax_amount = estimated fee
  +- ticket_finance.net_total = paidAmount - estimated fee
  +- ticket_finance.discount_amount = 0.00
  +- ticket_finance.payment_plan = full
  +- ticket_finance.sale_source = site
```

There is no discount calculation in the Stripe webhook because Stripe already
collected the final checkout amount.

## Customer Mapping

`mapCheckoutCustomer()` normalizes data from Stripe:

- custom field for name if present;
- custom Instagram field or metadata Instagram;
- `customer_details.email` or `customer_email`;
- `customer_details.phone`.

Instagram is normalized through `extractInstagramUsername()` from
`@/entities/ticket`.

## Logging

Stripe logs use consistent steps:

```txt
RECEIVED
VERIFY
ROUTE
CLAIM
PROCESS
DB
FINANCE
QR
EMAIL
DONE
FAIL
```

`stripeEventId` and `stripeSessionId` are attached to structured log context so
one webhook can be traced across files.

## Tests

Focused tests:

- `src/app/stripe/checkout-fulfillment-claim.test.ts`
- `src/app/stripe/verify-webhook.test.ts`
- `src/app/stripe/route-handler.test.ts`
- `src/app/stripe/log.test.ts`
- `src/app/stripe/map-checkout-customer.test.ts`
- `src/app/stripe/handlers/checkout-session-completed.test.ts`
- `src/app/stripe/stripe-battle-ticket-fulfillment.test.ts`

Useful command:

```bash
npm test -- stripe
```
