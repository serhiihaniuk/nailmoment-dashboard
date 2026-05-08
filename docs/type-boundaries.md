# TypeScript And Runtime Boundaries

This project uses TypeScript strictness plus Zod parsing to catch bad data at
the earliest practical boundary.

The important rule: do not let unknown external data become trusted UI/domain
state without parsing.

## Boundary Table

| Boundary | Untrusted input | Parser / guard | Trusted output | Owner |
| --- | --- | --- | --- | --- |
| HTTP JSON body | `request.json()` | `parseRequestJson(request, schema)` | `z.output<TSchema>` | `src/app/api-routes/lib/request.ts` |
| HTTP route params | promised `params` object from Next | `parseRouteParams(params, schema)` | branded or schema-validated params | `src/app/api-routes/lib/request.ts` |
| Ticket id route param | raw string | `ticketIdSchema`, `parseTicketId()` | `TicketId` branded string | `src/entities/ticket/model/ticket.ts` |
| Battle Ticket id route param | raw string | `battleTicketIdSchema`, `parseBattleTicketId()` | `BattleTicketId` branded string | `src/entities/battle-ticket/model/battle-ticket.ts` |
| Payment id route param | raw string | `paymentInstallmentIdSchema`, `parsePaymentInstallmentId()` | `PaymentInstallmentId` branded string | `src/entities/ticket/model/ticket.ts` |
| Ticket create body | JSON from admin UI | `insertTicketClientSchema` then `insertTicketSchema` | DB insert-compatible ticket input | `src/shared/db/schema.zod.ts` |
| Ticket update body | JSON PATCH body | `updateTicketSchema` | DB update-compatible ticket patch | `src/shared/db/schema.zod.ts` |
| Finance update body | JSON PATCH body | `upsertTicketFinanceSchema` | normalized finance patch | `src/shared/db/schema.zod.ts` |
| Payment create body | JSON POST body | `insertPaymentInstallmentApiInputSchema` | normalized payment insert | `src/shared/db/schema.zod.ts` |
| Payment update body | JSON PATCH body | `patchPaymentInstallmentSchema` | normalized payment patch | `src/shared/db/schema.zod.ts` |
| Browser API response for tickets | `response.json()` | `parseTicketWithFinanceList()` | `TicketWithFinance[]` | `src/entities/ticket/model/ticket.ts` |
| Browser API response for one ticket | `response.json()` | `parseTicketWithFinance()` | `TicketWithFinance` | `src/entities/ticket/model/ticket.ts` |
| Browser API response for Battle Tickets | `response.json()` | `parseBattleTicketList()` | `BattleTicket[]` | `src/entities/battle-ticket/model/battle-ticket.ts` |
| Browser API response for one Battle Ticket | `response.json()` | `parseBattleTicket()` | `BattleTicket` | `src/entities/battle-ticket/model/battle-ticket.ts` |
| Browser API response for finance row | `response.json()` | `ticketFinanceSchema.parse()` | `TicketFinance` | `src/entities/ticket/model/ticket.ts` |
| Browser API response for payment row | `response.json()` | `paymentInstallmentSchema.parse()` | `PaymentInstallment` | `src/entities/ticket/model/ticket.ts` |
| Audience Vote create body | JSON from Operator UI | `createAudienceVoteClientSchema` | normalized draft/scheduled create input | `src/shared/db/schema.zod.ts` |
| Browser API response for Audience Votes | `response.json()` | `parseAudienceVoteList()` / `parseAudienceVote()` | `AudienceVote[]` / `AudienceVote` | `src/entities/audience-vote/model/audience-vote.ts` |
| Stripe webhook body | raw HTTP body string | `stripe.webhooks.constructEvent()` | `Stripe.Event` | `src/app/stripe/verify-webhook.ts` |
| Stripe checkout session | authentic Stripe event payload | `validateCheckoutSessionCompletedEvent()`, `resolveCheckoutSession()` | accepted checkout branch | `src/app/stripe/*` |
| Env vars | `process.env` | scoped readers in `env.ts` | trimmed string config or controlled error | `src/shared/config/env.ts` |
| Drizzle rows | database result rows | Drizzle inferred types; hydrate/map in service | DB row types or hydrated shapes | `src/shared/db/service/*` |
| Finance calculations | nullable/unknown money fields | `toMoneyNumber()`, `normalizeMoneyString()`, finance helpers | normalized money strings and totals | `src/entities/ticket/model/*` |

## Boundary Flow

```txt
HTTP request
  |
  +- parseRouteParams()
  +- parseRequestJson()
  |
  v
route handler
  |
  +- shared DB service
  +- entity domain helper
  |
  v
NextResponse.json()
  |
  v
browser API client
  |
  +- response.json()
  +- entity parser
  |
  v
React Query / UI
```

## Why There Are Two Schema Families

`src/shared/db/schema.ts`

- Drizzle table definitions.
- Persistence source of truth.
- Drizzle-inferred row/insert types.
- Database enum values.

`src/shared/db/schema.zod.ts`

- API/DB input schemas.
- Insert/update request validation.
- Money/date coercion for write bodies.
- Good place for transport shapes that map directly to DB writes.

`src/entities/ticket/model/ticket.ts`

- Browser-facing domain schemas.
- Ticket/payment branded IDs.
- Money normalization for values leaving API boundaries.
- Ticket grade parsing and safe fallback for legacy rows.
- Public parse functions used by pages/widgets.

`src/entities/battle-ticket/model/battle-ticket.ts`

- Browser-facing Battle Ticket domain schemas.
- Battle Ticket branded IDs.
- Manual Battle Ticket and Stripe Battle Ticket origin derivation.
- Battle Ticket Delivery Status derivation from email provider handoff state.
- Public parse functions used by battle pages/widgets.

This split avoids treating a DB row as automatically safe UI/domain data.

## Canonical Ticket Domain Types

Use `@/entities/ticket` for data rendered or edited by pages/widgets:

- `Ticket`
- `TicketFinance`
- `PaymentInstallment`
- `TicketFinanceSummary`
- `TicketWithFinance`
- `TicketGrade`
- `PaymentPlan`
- `SaleSource`
- `PaymentMethod`
- `InvoiceStatus`

Use `@/entities/battle-ticket` for Battle Ticket data rendered or edited by
pages/widgets:

- `BattleTicket`
- `BattleTicketId`
- `BattleTicketOrigin`
- `BattleTicketDeliveryStatus`
- `BattleTicketPaymentType`

Use `@/entities/audience-vote` for Audience Vote data rendered or edited by
pages/widgets:

- `AudienceVote`
- `AudienceVoteId`
- `AudienceVoteKind`
- `AudienceVoteStatus`

Use `@/shared/db/schema.zod` types for route request bodies and DB write input:

- `InsertTicketInput`
- `UpdateTicketInput`
- `UpsertTicketFinanceInput`
- `InsertPaymentInstallmentInput`
- `PatchPaymentInstallmentInput`
- `InsertBattleTicketInput`
- `UpdateBattleTicketInput`
- `CreateAudienceVoteClientInput`
- `CreateAudienceVoteClientOutput`
- `InsertAudienceVoteInput`

## Money Rules

Money travels through the app as normalized strings at boundaries:

```txt
"199.00"
"0.00"
```

Inside focused calculation helpers, money may become a number or cents. It
should return to a normalized string before crossing API/UI boundaries.

Main helpers:

- `normalizeMoneyString(value)`
- `toMoneyNumber(value)`
- `splitMoney(value, count)`
- `calculateTicketFinanceTotals(finance)`
- `buildTicketFinanceSummary(finance, payments)`

## Date Rules

Date input schemas convert empty values to `null` where absence is valid:

```txt
"" | null | undefined -> null
```

Payment date fields:

- `due_date`
- `paid_date`

Finance UI and cache helpers should preserve `null` for empty dates rather than
inventing invalid `Date` objects.

## Stripe Boundary

Stripe is special because signature verification depends on exact raw body
bytes.

Do this:

```txt
request.text()
  -> stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
```

Do not do this before verification:

```txt
request.json()
```

After signature verification, checkout sessions still pass app-level guards:

- mode must be `payment`;
- livemode must match config;
- currency allow-list must match if configured;
- price id allow-list must match if configured;
- payment status must be `paid`;
- metadata must identify Nail Moment and a known branch.

## React Query Boundary

Page API clients parse server responses before React Query stores them.

Example:

```txt
src/pages/finance/api/client.ts
  fetchTickets()
    -> fetch("/api/ticket")
    -> parseTicketWithFinanceList(await response.json())
    -> TicketWithFinance[]
```

Optimistic updates in `src/pages/finance/model/finance-cache.ts` operate on
already-parsed `TicketWithFinance[]`.

## Practical Rules

- Do not cast `response.json()` to a domain type. Parse it.
- Do not cast route params to IDs. Use branded ID schemas.
- Do not add business schemas to `shared` when they are reusable domain
  concepts; use `entities/ticket`.
- Do not add UI-only form schemas to entities unless the schema is genuinely
  reusable domain logic.
- Do not weaken TypeScript strictness to make route or response problems
  disappear.
