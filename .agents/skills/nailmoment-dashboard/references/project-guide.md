# Nail Moment Dashboard Project Guide

Use this reference after `SKILL.md` when you need a task-specific checklist.

## First Checks

```powershell
Get-Content -LiteralPath .\package.json
Get-Content -LiteralPath .\AGENTS.md
Get-Content -LiteralPath .\ARCHITECTURE.md
```

Search examples:

```powershell
git ls-files | Select-String -Pattern "finance"
Select-String -Path (git ls-files | Where-Object { $_ -match '\.ts$|\.tsx$' }) -Pattern "parseTicketWithFinance"
Get-Content -LiteralPath .\src\pages\finance\api\client.ts
```

## Task Routing

Finance:

```txt
docs/finance-flow.md
src/pages/finance/api/client.ts
src/pages/finance/model/use-finance-autosave.ts
src/pages/finance/model/finance-cache.ts
src/pages/finance/ui/payments-panel.tsx
src/app/api-routes/ticket/[id]/finance/*
src/app/api-routes/payments/[paymentId]/route.ts
src/entities/ticket/model/finance-summary.ts
```

Stripe:

```txt
docs/stripe-flow.md
app/api/webhooks/stripe/route.ts
src/app/api-routes/webhooks/stripe/route.ts
src/app/stripe/verify-webhook.ts
src/app/stripe/route-handler.ts
src/app/stripe/handlers/checkout-session-completed.ts
src/shared/db/schema.ts
drizzle/0014_stripe_webhook_events.sql
drizzle/0015_stripe_fulfillment_uniques.sql
```

Ticket, QR, email:

```txt
docs/ticket-email-qr-flow.md
src/app/api-routes/ticket/route.ts
src/app/api-routes/ticket/[id]/route.ts
src/shared/email/send-email.ts
src/shared/email/email-template.tsx
src/pages/pdf-ticket-preview/api/email-preview.ts
```

DB/schema:

```txt
docs/data-model.md
src/shared/db/schema.ts
src/shared/db/schema.zod.ts
src/shared/db/service/*
drizzle/*.sql
```

Type boundaries:

```txt
docs/type-boundaries.md
src/app/api-routes/lib/request.ts
src/entities/ticket/model/ticket.ts
src/shared/db/schema.zod.ts
```

Telegram:

```txt
docs/telegram-flow.md
src/app/api-routes/tg/festival-bot/*
src/app/api-routes/tg/speaker-bot/route.ts
src/entities/voting/model/voting.ts
src/app/api-routes/speaker_vote/route.ts
```

## Safe Implementation Pattern

1. Identify the route/page/slice owner.
2. Read the focused doc and nearby files.
3. Decide the runtime boundary:
   - route body -> `parseRequestJson`
   - route params -> `parseRouteParams`
   - browser response -> entity parser
   - DB writes -> `shared/db/schema.zod.ts`
4. Make the smallest coherent change.
5. Add or update focused tests when behavior changes.
6. Run validation and report results.

## DB And Production Reminder

Do not run production SQL, migrations, Blob deletes, Stripe live changes,
Resend customer sends, or Telegram broadcasts unless the user explicitly
approves the concrete action and the environment is verified.
