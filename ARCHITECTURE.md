# Nail Moment Dashboard Architecture

Production operations dashboard for Nail Moment: tickets, battle registrations,
finance/payment tracking, QR/email delivery, Stripe checkout fulfillment,
Telegram voting, and internal previews.

This file is the route-first project index. It tells you where each major
system lives, then links to deeper docs when you need implementation detail.

## Read First

This is a live production system. Before touching production data, deployments,
webhooks, Blob assets, QR codes, Stripe, Telegram, or email sending, read
`AGENTS.md`.

Important constraints:

- `main` is production.
- Production host is Vercel.
- Production database is Neon Postgres.
- Production QR files live in Vercel Blob.
- Dev and production env values are stored separately under `.vercel/`.
- Verify the active env file before write testing or external-service testing.
- Current write flows do not rely on database transactions.
- Prefer additive, reversible DB changes and test on a Neon branch first.

## Deep Docs

Use these as the daily navigation set:

| Need | Doc |
| --- | --- |
| Find a route, handler, auth requirement, schema, parser, or side effect | [docs/routes.md](docs/routes.md) |
| Understand tables and relationships visually | [docs/data-model.md](docs/data-model.md) |
| Understand TypeScript/Zod/Drizzle/entity boundaries | [docs/type-boundaries.md](docs/type-boundaries.md) |
| Debug finance totals, autosave, discounts, payment plans | [docs/finance-flow.md](docs/finance-flow.md) |
| Debug Stripe checkout webhook fulfillment and totals | [docs/stripe-flow.md](docs/stripe-flow.md) |
| Debug ticket creation, QR codes, Resend emails, PDF/email previews | [docs/ticket-email-qr-flow.md](docs/ticket-email-qr-flow.md) |
| Debug Telegram bots and voting | [docs/telegram-flow.md](docs/telegram-flow.md) |
| Build new Audience Vote Mini App voting | [docs/audience-vote-plan.md](docs/audience-vote-plan.md) |

> Legacy note: Existing Telegram voting routes are leftovers from a previous event season. Do not deepen or refactor this flow; future Telegram voting should be designed as a fresh implementation. See [ADR-0001](docs/adr/0001-treat-telegram-voting-as-legacy-pending-rewrite.md).

## Mental Model

The app has two routing layers:

```txt
Browser / external service
  |
  v
root app/ directory              Next.js App Router route files
  |
  v
src/app                          FSD app layer: providers, layouts, API route implementations, integrations
  |
  v
src/pages                        FSD pages layer: route-level UI and page-owned model/api logic
  |
  v
src/widgets                      Reused composite panels/header
  |
  v
src/entities                     Reusable ticket, Battle Ticket, and voting domain models
  |
  v
src/shared                       Infrastructure: DB, auth, UI kit, env, email, logging
```

The root `app/` folder exists because Next.js requires route files there.
Most route files in `app/` are thin re-exports into `src/app/api-routes/*` or
`src/pages/*`. That keeps framework wiring in the app layer and keeps business
UI in FSD page slices.

## FSD Ownership

Layer direction:

```txt
app -> pages -> widgets -> features -> entities -> shared
```

There is no `src/features/` layer today. Behavior starts in `src/pages/` and is
extracted only when reuse is real.

| Layer | Current role |
| --- | --- |
| `app/` | Next.js route wrappers, root layout, API route entry files |
| `src/app/` | App layout, providers, API route implementations, Stripe integration |
| `src/pages/` | Route-level UI, page-local API clients, page-local model logic |
| `src/widgets/` | Reused composite panels and header |
| `src/entities/` | Reusable ticket, Battle Ticket, and voting domain types, parsers, and calculations |
| `src/shared/` | Infrastructure: DB, auth, env, email, UI kit, generic helpers |

Ownership rules:

- Page-specific UI/model/API logic starts in `src/pages/<slice>/`.
- Reusable ticket/finance/payment rules belong in `src/entities/ticket/`.
- Reusable Battle Ticket browser-facing data belongs in `src/entities/battle-ticket/`.
- DB table shape and route input schemas live in `src/shared/db/`.
- Generic request parsing lives in `src/app/api-routes/lib/request.ts`.
- External service plumbing lives close to the owning app/shared boundary.

## Project Structure

```txt
app/
  (auth)/login/page.tsx                 Next.js route wrapper -> src/pages/login
  (protected)/*/page.tsx                Protected route wrappers -> src/pages/*
  (protected)/layout.tsx                Protected route wrapper -> src/app/layouts/protected-layout
  api/**/route.ts                       API wrappers -> src/app/api-routes/*
  layout.tsx                            HTML shell, fonts, globals
  page.tsx                              Home route wrapper

src/
  app/
    api-routes/                         Real Next route implementations
    layouts/protected-layout.tsx        Auth guard, header, React Query provider
    providers/react-query.tsx           Client QueryClient provider
    stripe/                             Stripe verification, routing, fulfillment, logging

  pages/
    dashboard/                          Ticket table page
    finance/                            Finance table, side panel, autosave, optimistic cache
    battle/                             Battle registrations page
    ticket-detail/                      Ticket detail page
    battle-ticket-detail/               Battle detail page
    login/                              Login UI
    info/                               Help/info page
    pdf-demo/                           Email/PDF demo UI
    pdf-ticket-preview/                 Email preview page and server actions
    speaker-vote/                       Speaker vote results UI
    audience-votes/                     Audience Vote list/create UI
    home/                               Root route UI

  widgets/
    header/                             Main navigation
    ticket-panel/                       Ticket detail slide panel and edit dialog
    battle-ticket-panel/                Battle ticket slide panel and edit dialog

  entities/
    battle-ticket/                      Battle Ticket browser-facing domain and parsers
    audience-vote/                      Audience Vote browser-facing domain and parsers
    ticket/                             Ticket, finance, payment, money, grade domain
    voting/                             Static voting categories/broadcast domain

  shared/
    better-auth/                        Better Auth server/client setup
    config/env.ts                       Scoped env readers
    db/                                 Drizzle schema, DB client, DB services, route schemas
    email/                              React Email templates, Resend, QR Blob upload
    lib/                                Generic utilities
    ui/                                 shadcn-style UI primitives
    logtail.ts                          Logtail client

docs/
  routes.md                             Route matrix
  data-model.md                         Table diagram and relation notes
  type-boundaries.md                    TypeScript runtime boundary map
  finance-flow.md                       Finance/autosave/deep payment flows
  stripe-flow.md                        Stripe webhook fulfillment
  ticket-email-qr-flow.md               Ticket, QR, email, preview flows
  telegram-flow.md                      Telegram bots and voting

drizzle/
  *.sql                                 Database migrations
  meta/                                 Drizzle migration metadata
```

## Entry Points

For the full route matrix, use [docs/routes.md](docs/routes.md).

High-level route entry:

```txt
UI route
  -> app/(protected or auth)/.../page.tsx
  -> src/pages/<slice>

API route
  -> app/api/.../route.ts
  -> src/app/api-routes/.../route.ts

Stripe webhook
  -> app/api/webhooks/stripe/route.ts
  -> src/app/api-routes/webhooks/stripe/route.ts
  -> src/app/stripe/*

Telegram webhook
  -> app/api/tg/*/route.ts
  -> src/app/api-routes/tg/*/route.ts
```

Protected UI routes render through:

```txt
app/(protected)/layout.tsx
  -> src/app/layouts/protected-layout.tsx
     -> QueryProvider
     -> Header
     -> AuthGuard
       -> no session: /login?from=<current-path>
       -> session: render page
```

## Domain And Type Boundaries

For the full TypeScript boundary table, use
[docs/type-boundaries.md](docs/type-boundaries.md).

Short version:

```txt
HTTP body
  -> parseRequestJson()
  -> route Zod schema from shared/db/schema.zod.ts
  -> service/domain logic

Route params
  -> parseRouteParams()
  -> branded entity id schema from entities/ticket or entities/battle-ticket

Browser response JSON
  -> page API client
  -> entity parser from entities/ticket or entities/battle-ticket
  -> React Query/UI

Drizzle row
  -> shared/db service
  -> hydrate/map as needed
  -> entity parser before browser UI trust
```

## Data Model

For the visual diagram, use [docs/data-model.md](docs/data-model.md).

Primary groups:

- Auth: `user`, `session`, `account`, `verification`.
- Tickets: `ticket`, `battle_ticket`.
- Finance: `ticket_finance`, `payment_installment`.
- Stripe audit/idempotency: `stripe_webhook_event`.
- Telegram voting: `telegram_users`, `battle_vote_tg`, `speaker_vote_tg`.
- Audience Vote: `audience_vote`, `vote_candidate`.

Important idempotency fields:

- `ticket.stripe_event_id` is unique.
- `battle_ticket.stripe_event_id` is unique.
- `stripe_webhook_event.id` is the Stripe event id primary key.

Manual admin-created records use fake Stripe ids:

```txt
manual_<ticketId>
manual_battle_<battleTicketId>
```

## Common Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For narrow changes:

```bash
npm test -- finance
npm test -- stripe
npm test -- ticket
```

## Quick Navigation

Add/edit a dashboard page:

```txt
app/(protected)/<route>/page.tsx
src/pages/<slice>/
src/widgets/*             only when a composite block is reused
src/shared/ui/*           generic UI primitive only
```

Change ticket or finance domain logic:

```txt
src/entities/ticket/model/*
src/shared/db/schema.zod.ts
src/shared/db/service/*
src/pages/finance/model/*
```

Change finance autosave:

```txt
src/pages/finance/ui/*
src/pages/finance/model/use-finance-autosave.ts
src/pages/finance/model/finance-cache.ts
src/pages/finance/api/client.ts
src/app/api-routes/ticket/[id]/*
src/app/api-routes/payments/[paymentId]/route.ts
```

Change Stripe checkout fulfillment:

```txt
app/api/webhooks/stripe/route.ts
src/app/api-routes/webhooks/stripe/route.ts
src/app/stripe/verify-webhook.ts
src/app/stripe/route-handler.ts
src/app/stripe/handlers/checkout-session-completed.ts
src/shared/db/schema.ts
drizzle/0014_stripe_webhook_events.sql
drizzle/0015_stripe_fulfillment_uniques.sql
```

Change email or QR behavior:

```txt
src/shared/email/send-email.ts
src/shared/email/email-template.tsx
src/shared/email/battle-email-template.tsx
src/pages/pdf-ticket-preview/api/email-preview.ts
src/app/api-routes/pdf/[id]/route.tsx
```

Change Telegram voting:

```txt
src/pages/audience-votes/*
src/entities/audience-vote/*
src/app/api-routes/audience-vote/route.ts
src/app/api-routes/tg/festival-bot/*
src/app/api-routes/tg/speaker-bot/route.ts
src/entities/voting/model/voting.ts
src/app/api-routes/speaker_vote/route.ts
src/pages/speaker-vote/*
src/shared/db/schema.ts
```

Add a DB field:

```txt
src/shared/db/schema.ts
drizzle/*.sql
src/shared/db/schema.zod.ts
src/entities/ticket/model/*       if ticket/finance browser-facing
src/shared/db/service/*
src/pages/*/api/client.ts         if client-facing
src/pages/*/ui
```

## Gotchas

- `src/pages/` is FSD pages, not Next.js Pages Router. See `pages/README.md`.
- Root `app/` files are route wrappers; real app-layer code usually lives in
  `src/app/`.
- Stripe webhook verification must read the raw request body. Do not call
  `request.json()` before `stripe.webhooks.constructEvent()`.
- QR Blob writes use deterministic paths with `allowOverwrite: false`; do not
  overwrite/delete production QR files casually.
- Stripe-origin payment rows are locked down. Only invoice fields are editable.
- Finance page autosave is optimistic. Cache helpers must recalculate summaries
  when ticket, finance, or payment fields change.
- Payment plan sync is server-side because changing a plan may require finance
  updates plus payment create/update/delete steps.
- Manual ticket creation uses fake `stripe_event_id` values beginning with
  `manual`.
- Email send failures usually do not roll back ticket creation.
