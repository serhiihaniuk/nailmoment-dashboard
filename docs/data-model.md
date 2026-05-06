# Data Model

Primary persistence lives in `src/shared/db/schema.ts`; migrations live in
`drizzle/`.

This doc is about relationships and operational meaning. For exact column
definitions, use the Drizzle schema.

## Diagram

```mermaid
erDiagram
  user ||--o{ session : owns
  user ||--o{ account : owns

  ticket ||--o| ticket_finance : has
  ticket ||--o{ payment_installment : has
  stripe_webhook_event ||--o| ticket : correlates
  stripe_webhook_event ||--o| battle_ticket : correlates

  telegram_users ||--o{ battle_vote_tg : casts

  ticket {
    text id PK
    text stripe_event_id UK
    text name
    text email
    text instagram
    text phone
    text qr_code
    text grade
    text updated_grade
    boolean arrived
    boolean archived
    boolean mail_sent
    text comment
    timestamptz date
  }

  ticket_finance {
    text id PK
    text ticket_id FK
    enum sale_source
    enum payment_plan
    decimal gross_total
    decimal discount_amount
    decimal tax_amount
    decimal net_total
    text nip
    text finance_note
  }

  payment_installment {
    text id PK
    text ticket_id FK
    integer installment_number
    decimal amount
    enum sale_source
    timestamptz due_date
    timestamptz paid_date
    boolean is_paid
    enum payment_method
    enum invoice_status
    text invoice_number
    text comment
  }

  battle_ticket {
    text id PK
    text stripe_event_id UK
    text name
    text email
    text instagram
    text phone
    integer nomination_quantity
    boolean archived
    boolean mail_sent
    boolean photos_sent
    text comment
    enum payment_type
  }

  stripe_webhook_event {
    text id PK
    text type
    text stripe_session_id
    enum status
    text status_reason
    text last_error
    integer attempt_count
    timestamptz processed_at
  }

  telegram_users {
    bigint telegramUserId PK
    text firstName
    text username
    boolean isActive
    timestamptz lastBroadcastSentAt
  }

  battle_vote_tg {
    text id PK
    bigint telegram_user_id
    text category_id
    text voted_for_contestant_id
  }

  speaker_vote_tg {
    text id PK
    text voted_for_id
  }
```

The Stripe correlations above are operational correlations, not declared
foreign keys: `stripe_webhook_event.stripe_session_id` matches
`ticket.stripe_event_id` or `battle_ticket.stripe_event_id`.

## Table Groups

### Auth

`user`, `session`, `account`, and `verification` are Better Auth tables.

Ownership:

- Schema: `src/shared/db/schema.ts`
- Auth config: `src/shared/better-auth/auth.ts`
- Client hooks: `src/shared/better-auth/hooks.ts`
- Protected UI layout: `src/app/layouts/protected-layout.tsx`

### Ticket

`ticket` stores regular festival tickets.

Important fields:

- `id`: local public ticket id.
- `stripe_event_id`: for Stripe purchases this stores the Checkout Session id;
  for manual admin records it stores `manual_<ticketId>`.
- `qr_code`: public Vercel Blob URL.
- `grade`: original ticket grade.
- `updated_grade`: optional override shown in some UI/email flows.
- `arrived`: check-in state.
- `mail_sent`: whether the normal ticket email was sent successfully.

Uniqueness:

- `ticket_stripe_event_id_unique` prevents one Stripe checkout from creating
  two regular tickets.

### Battle Ticket

`battle_ticket` stores battle registrations.

Important fields:

- `stripe_event_id`: for Stripe purchases this stores the Checkout Session id;
  for manual admin records it stores `manual_battle_<battleTicketId>`.
- `nomination_quantity`: number of nominations purchased/registered.
- `mail_sent`: battle email status.
- `photos_sent`: operational status for photo delivery.
- `payment_type`: legacy/simple battle payment type.

Uniqueness:

- `battle_ticket_stripe_event_id_unique` prevents one Stripe checkout from
  creating two battle tickets.

### Finance

`ticket_finance` is one-to-one with `ticket`.

Meaning:

- `gross_total`: base ticket amount before discount.
- `discount_amount`: discount amount, not percent.
- `tax_amount`: tax/fee amount. For Stripe webhook-created records this stores
  the app's estimated Stripe fee.
- `net_total`: payable total minus tax/fee.
- `payment_plan`: `full`, `two_parts`, `three_parts`, `custom`, `free`,
  `sponsor`.
- `sale_source`: `site`, `direct_transfer`, or `other`.

Domain calculations live in `src/entities/ticket/model/finance-summary.ts`.

### Payment Installments

`payment_installment` is one-to-many with `ticket`.

Meaning:

- `amount`: installment amount.
- `is_paid`: canonical paid flag used by finance summary.
- `paid_date`: date paid; can be null even when editing unpaid plans.
- `due_date`: due date for unpaid installments.
- `payment_method`: operational payment method.
- `invoice_status` / `invoice_number`: invoice tracking.

Stripe-origin payments:

- Created by `src/app/stripe/handlers/checkout-session-completed.ts`.
- Have `sale_source = site`.
- Are marked `is_paid = true`.
- Are protected from manual edits except invoice fields by
  `src/app/api-routes/payments/[paymentId]/route.ts`.

### Stripe Webhook Event

`stripe_webhook_event` is both an audit table and an idempotency lock.

Primary key:

- `id` is the Stripe event id.

Status values:

- `processing`: a worker claimed the event.
- `processed`: fulfillment completed.
- `ignored`: the app intentionally skipped this event.
- `failed`: fulfillment threw; Stripe can retry and the handler can reclaim.

Why event id, not session id:

- Stripe retries the same event id when delivery fails.
- The session id is stored separately for operator search and correlation with
  ticket/battle rows.

### Telegram Voting

`telegram_users` stores users seen by the bots and broadcast throttling state.

`battle_vote_tg` stores battle/festival vote rows:

- `telegram_user_id`
- `category_id`
- `voted_for_contestant_id`

`speaker_vote_tg` stores speaker vote rows and is aggregated by
`GET /api/speaker_vote`.

## Finance Formula

```txt
gross_total - discount_amount = payableTotal
payableTotal - tax_amount     = netTotal
sum(payment.amount where is_paid) = paidTotal
payableTotal - paidTotal      = remainingTotal
```

Zero payment plans:

```txt
payment_plan in ("free", "sponsor")
  -> gross_total = 0.00
  -> discount_amount = 0.00
  -> tax_amount = 0.00
  -> net_total = 0.00
  -> payment_status = paid
```

## Migration Notes

Relevant finance/Stripe migrations:

- `drizzle/0014_stripe_webhook_events.sql`: adds webhook audit/idempotency
  table.
- `drizzle/0015_stripe_fulfillment_uniques.sql`: adds unique constraints on
  `ticket.stripe_event_id` and `battle_ticket.stripe_event_id`.
- `drizzle/0018_payment_sale_source.sql`: adds payment sale source.
- `drizzle/0019_payment_installment_is_paid.sql`: adds `is_paid`.
- `drizzle/0020_finance_discount_storage_backfill.sql`: discount storage
  backfill.

Production migration work must follow `AGENTS.md`.
