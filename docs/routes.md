# Route Matrix

Use this table when you know a URL and need to find the actual implementation,
runtime boundary, response parser, and side effects.

## UI Routes

| URL | Root route file | Real owner | Auth | Notes |
| --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | `src/pages/home` | Public | Home route wrapper. |
| `/login` | `app/(auth)/login/page.tsx` | `src/pages/login` | Public | Receives `from` query after protected redirect. |
| `/dashboard` | `app/(protected)/dashboard/page.tsx` | `src/pages/dashboard` | Protected layout | Ticket table and ticket panel entry. |
| `/finance` | `app/(protected)/finance/page.tsx` | `src/pages/finance` | Protected layout | Finance table, side panel, autosave, payment plan sync. |
| `/battle` | `app/(protected)/battle/page.tsx` | `src/pages/battle` | Protected layout | Battle ticket table and creation dialog. |
| `/battle/:id` | `app/(protected)/battle/[id]/page.tsx` | `src/pages/battle-ticket-detail` | Protected layout | Battle ticket detail page. |
| `/ticket/:id` | `app/(protected)/ticket/[id]/page.tsx` | `src/pages/ticket-detail` | Protected layout | Ticket detail page and arrival tools. |
| `/pdf/:id` | `app/(protected)/pdf/[id]/page.tsx` | `src/pages/pdf-ticket-preview` | Protected layout | Ticket email/PDF preview UI. |
| `/pdf/demo` | `app/(protected)/pdf/demo/page.tsx` | `src/pages/pdf-demo` | Protected layout | Demo email/PDF preview. |
| `/speaker_vote` | `app/(protected)/speaker_vote/page.tsx` | `src/pages/speaker-vote` | Protected layout | Speaker vote results dashboard. |
| `/info` | `app/(protected)/info/page.tsx` | `src/pages/info` | Protected layout | Help/info page. |

Protected routes render through:

```txt
app/(protected)/layout.tsx
  -> src/app/layouts/protected-layout.tsx
     -> QueryProvider
     -> Header
     -> AuthGuard
```

## API Routes

> Legacy note: `/api/tg/*` routes are leftovers from a previous event season. Do not deepen or refactor them; future Telegram voting should be redesigned from scratch. See [ADR-0001](adr/0001-treat-telegram-voting-as-legacy-pending-rewrite.md).

| Method / URL | Root route file | Implementation | Auth | Request parsing | Response parsing / consumer | Side effects |
| --- | --- | --- | --- | --- | --- | --- |
| `ALL /api/auth/[...all]` | `app/api/auth/[...all]/route.ts` | `src/app/api-routes/auth/[...all]/route.ts` | Better Auth route | Better Auth | Better Auth client/hooks | Session/account auth. |
| `GET /api/ticket` | `app/api/ticket/route.ts` | `src/app/api-routes/ticket/route.ts` | Required | none | `parseTicketWithFinanceList()` in finance client; widget/panel clients parse detail responses | Reads tickets, finance rows, payments, summary. |
| `POST /api/ticket` | `app/api/ticket/route.ts` | `src/app/api-routes/ticket/route.ts` | Required | `insertTicketClientSchema`, then `insertTicketSchema` | `createTicketResponseSchema` in finance client | Creates manual ticket, QR Blob, Resend ticket email best-effort. |
| `GET /api/ticket/:id` | `app/api/ticket/[id]/route.ts` | `src/app/api-routes/ticket/[id]/route.ts` | Required | `ticketIdSchema` route param | `parseTicketWithFinance()` in ticket panel / finance client | Reads hydrated ticket. |
| `PATCH /api/ticket/:id` | `app/api/ticket/[id]/route.ts` | `src/app/api-routes/ticket/[id]/route.ts` | Required | `ticketIdSchema`, `updateTicketSchema` | `ticketSchema` or `parseTicketWithFinance()` depending client | Updates ticket fields. |
| `POST /api/ticket/:id` | `app/api/ticket/[id]/route.ts` | `src/app/api-routes/ticket/[id]/route.ts` | Required | `ticketIdSchema` | JSON message | Resends ticket email and marks `mail_sent`. |
| `GET /api/ticket/:id/finance` | `app/api/ticket/[id]/finance/route.ts` | `src/app/api-routes/ticket/[id]/finance/route.ts` | Required | `ticketIdSchema` | Direct JSON finance row | Reads finance row for ticket. |
| `PATCH /api/ticket/:id/finance` | `app/api/ticket/[id]/finance/route.ts` | `src/app/api-routes/ticket/[id]/finance/route.ts` | Required | `ticketIdSchema`, `upsertTicketFinanceSchema` | `ticketFinanceSchema` in finance client | Upserts finance row. |
| `PATCH /api/ticket/:id/finance/payment-plan` | `app/api/ticket/[id]/finance/payment-plan/route.ts` | `src/app/api-routes/ticket/[id]/finance/payment-plan/route.ts` | Required | `ticketIdSchema`, local `{ payment_plan }` schema using `paymentPlanSchema` | `parseTicketWithFinance()` in finance client | Updates plan, preserves paid payments, creates/deletes/renumbers unpaid payments. |
| `GET /api/ticket/:id/payments` | `app/api/ticket/[id]/payments/route.ts` | `src/app/api-routes/ticket/[id]/payments/route.ts` | Required | `ticketIdSchema` | Payment rows | Reads payments for one ticket. |
| `POST /api/ticket/:id/payments` | `app/api/ticket/[id]/payments/route.ts` | `src/app/api-routes/ticket/[id]/payments/route.ts` | Required | `ticketIdSchema`, `insertPaymentInstallmentApiInputSchema` | `paymentInstallmentSchema` in finance client | Creates one payment installment. |
| `PATCH /api/payments/:paymentId` | `app/api/payments/[paymentId]/route.ts` | `src/app/api-routes/payments/[paymentId]/route.ts` | Required | `paymentInstallmentIdSchema`, `patchPaymentInstallmentSchema`, raw body keys | `paymentInstallmentSchema` in finance client | Updates payment. Stripe-origin payments allow invoice fields only. |
| `DELETE /api/payments/:paymentId` | `app/api/payments/[paymentId]/route.ts` | `src/app/api-routes/payments/[paymentId]/route.ts` | Required | `paymentInstallmentIdSchema` | `{ id }` schema in finance client | Deletes unpaid non-Stripe payment. |
| `GET /api/battle-ticket` | `app/api/battle-ticket/route.ts` | `src/app/api-routes/battle-ticket/route.ts` | Required | none | Battle page/table | Reads active battle tickets. |
| `POST /api/battle-ticket` | `app/api/battle-ticket/route.ts` | `src/app/api-routes/battle-ticket/route.ts` | Required | `insertBattleTicketClientSchema`, then `insertBattleTicketSchema` | Battle page/dialog | Creates manual battle ticket and sends battle email best-effort. |
| `GET /api/battle-ticket/:id` | `app/api/battle-ticket/[id]/route.ts` | `src/app/api-routes/battle-ticket/[id]/route.ts` | Required | `ticketIdSchema` route param | Battle ticket panel | Reads one battle ticket. |
| `PATCH /api/battle-ticket/:id` | `app/api/battle-ticket/[id]/route.ts` | `src/app/api-routes/battle-ticket/[id]/route.ts` | Required | `ticketIdSchema`, `updateBattleTicketSchema` | Battle ticket panel/dialog | Updates battle ticket. |
| `POST /api/webhooks/stripe` | `app/api/webhooks/stripe/route.ts` | `src/app/api-routes/webhooks/stripe/route.ts`, `src/app/stripe/*` | Stripe signature, not session auth | Raw body + `stripe-signature`; Stripe SDK; checkout guards | Stripe normalized handler result | Claims webhook, creates tickets/battle tickets, finance/payment rows, QR, email best-effort. |
| `POST /api/tg/festival-bot` | `app/api/tg/festival-bot/route.ts` | `src/app/api-routes/tg/festival-bot/route.ts` | Telegram webhook token route config | Grammy update parsing | Telegram response | Festival voting, media slider, broadcasts, DB votes/users. |
| `POST /api/tg/speaker-bot` | `app/api/tg/speaker-bot/route.ts` | `src/app/api-routes/tg/speaker-bot/route.ts` | Telegram webhook token route config | Grammy update parsing | Telegram response | Speaker/battle category voting and broadcasts. |
| `GET /api/speaker_vote` | `app/api/speaker_vote/route.ts` | `src/app/api-routes/speaker_vote/route.ts` | Required | none | Speaker vote page | Aggregates `speaker_vote_tg` counts. |
| `GET /api/pdf/:id` | `app/api/pdf/[id]/route.tsx` | `src/app/api-routes/pdf/[id]/route.tsx` | Required | raw `id` param | HTML response | Renders ticket email HTML preview. |
| `GET /api/pdf` | `app/api/pdf/route.ts` | `src/app/api-routes/pdf/route.ts` | none today | none | Plain response | Test Logtail endpoint. |

## Route Patterns

Most authenticated API routes:

```txt
auth.api.getSession()
  |
  +- parseRouteParams(..., entity branded id schema)
  |
  +- parseRequestJson(..., DB/API input schema)
  |
  +- shared DB service or focused route orchestration
  |
  +- NextResponse.json(...)
```

Routes with special handling:

- Stripe must read `request.text()` for signature verification before JSON
  parsing. See [stripe-flow.md](stripe-flow.md).
- Telegram routes are owned by Grammy's `webhookCallback`.
- PDF/email preview routes render HTML and can return `text/html`.
- Better Auth route is delegated to Better Auth.
