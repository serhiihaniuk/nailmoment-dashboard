# Agent Operating Guide

This repository runs a real production dashboard for Nail Moment. Treat it as a live operations system, not a sandbox.

## Current Production Setup

- App host: Vercel
- Vercel project: `nailmoment-dashboard`
- Vercel project ID: `prj_L97YzmsYKFfl5D6JZEDZzlEZenoS`
- Vercel team ID: `team_NOBQB5QysPjNegRytnc9bT3Z`
- Production domain: `dashboard.nailmoment.pl`
- Git production branch: `main`
- Database: Neon Postgres
- Neon project: `nailmoment-neon`
- Neon project ID: `empty-shape-44782927`
- Production Neon branch: `main`
- Production Neon branch ID: `br-noisy-queen-a225qbgr`
- Database name: `neondb`

The repository has separate local Vercel env files for dev and production: `.vercel/.env.preview.local` for the Dev Environment and `.vercel/.env.production.local` for production. Before testing workflows that can write data, send emails, create QR assets, process payments, or call external services, verify which env file and credentials are active.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `serhiihaniuk/nailmoment-dashboard`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo: domain language lives in root `CONTEXT.md`, and ADRs live in `docs/adr/`. See `docs/agents/domain.md`.

## Critical Rule

Do not make destructive or risky production changes casually. This includes database migrations, data updates, data deletes, Vercel Blob deletes, environment variable changes, domain changes, deployment config changes, and webhook changes.

If a task might affect production data, production users, sent ticket emails, QR codes, Stripe, Telegram bots, or Vercel Blob assets, stop and verify the environment first.

## Git Rules

- `main` is production.
- Do not push directly to `main` unless the user explicitly asks for it.
- For feature work, create a branch first.
- Prefer branch names like `codex/<short-task-name>` unless the user asks for another name.
- Before committing, run the relevant checks:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
- Before pushing, confirm `git status --short --branch`.

## TypeScript, FSD, And Code Organization Rules

This repo has intentional TypeScript and Feature-Sliced Design boundaries. Follow them even for quick fixes. Do not hide architectural drift inside one large file.

### Architecture Map

- `src/entities/ticket/model/ticket.ts` is the canonical ticket domain model. It owns ticket grades, ticket/payment ID parsers, finance enums, money normalization, and browser-facing ticket response schemas.
- `src/entities/ticket/index.ts` is the public ticket domain API. Import reusable ticket domain types from `@/entities/ticket`.
- `src/entities/ticket/index.client.ts` is the small client-safe UI entry point for ticket components that should not pull server-only code into the browser.
- `src/shared/db/schema.ts` and `src/shared/db/schema.zod.ts` describe persistence and route input shapes. Treat those as DB/API plumbing, not the default type to pass around pages and widgets.
- `src/app/api-routes/lib/request.ts` parses JSON bodies and route params with Zod before route handlers use them.
- `src/pages/finance/api/client.ts` parses finance/ticket browser API responses before returning typed data to React Query.
- `src/pages/finance/model/utils.ts` parses API error payloads into the finance page's `ApiError` and `fieldErrors` shape.
- `src/shared/config/env.ts` is the only place that should read required secrets directly. Add scoped readers there so importing one service does not force unrelated secrets to exist.

Rule of thumb: if a value is rendered or edited by pages/widgets, prefer the entity type from `@/entities/ticket`. If a value is being inserted into Drizzle, use the DB schema/input type from `@/shared/db`.

### TypeScript Strictness

Do not weaken strictness to make errors disappear:

- Keep `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled.
- Do not add `any`, broad `as SomeType` casts, double assertions, or non-null assertions to silence TypeScript.
- If a value is unknown at runtime, parse it with Zod or narrow it honestly.
- Treat `request.json()`, `response.json()`, route params, environment variables, webhook payloads, Telegram payloads, and database `returning()` results as untrusted until checked.
- `response.json()` and `request.json()` return `unknown` in practice. Parse them at the boundary, then pass parsed domain data inward.

### FSD Import Direction

Respect this layer direction:

```txt
app -> pages -> widgets -> features -> entities -> shared
```

- Lower layers (`src/pages`, `src/widgets`, `src/features`, `src/entities`) must not import from `@/app/*`.
- Import slices through public entry points such as `@/entities/ticket`; do not import from `@/entities/ticket/model/*`, `@/widgets/*/ui/*`, etc. unless you are editing inside that slice.
- Page-specific server actions belong in the owning page slice, for example `src/pages/pdf-ticket-preview/api/email-preview.ts`, not in `src/app/actions`.
- `eslint.config.mjs` protects the main boundary mistakes: lower layers importing `@/app/*`, imports from internal slice files, and legacy non-FSD aliases such as `@/components/*`.

### Slice Placement And File Size Discipline

Do not create a huge widget or page component that contains everything. A 3,000-line widget is one symptom; the deeper problem is skipping ownership decisions and mixing API, model, domain, and UI concerns in one place.

Before implementing a non-trivial UI or workflow, do a short ownership pass:

1. Which route or slice owns this behavior today?
2. Is it used in one place or already reused in multiple places?
3. Is the logic domain-specific, page-specific, or generic infrastructure?
4. Where will runtime parsing happen?
5. Which public API should other slices import from?

Then place code by current ownership, not by what might be reusable someday:

- Start in `src/pages/<page-slice>` for behavior used by one route. A large single-page workflow still belongs in the page slice first.
- Create a `widget` only when a composite UI block is reused across pages or has a stable cross-page responsibility.
- Create a `feature` only for a reusable user action used in more than one place.
- Create or extend an `entity` only for reusable business domain concepts, schemas, parsers, or entity UI.
- Keep `shared` free of business logic. Shared is for UI kit, generic libraries, config readers, DB plumbing, and infrastructure.

Common mistakes to avoid:

- Do not create `widgets/<name>/ui/<name>.tsx` as a dumping ground for an entire page.
- Do not move page-only code into `widgets` or `features` just because the component is large.
- Do not put Zod schemas, fetch calls, mutations, table setup, forms, dialogs, and rendering into one TSX file.
- Do not bypass a slice public API to import from another slice's internal `api`, `model`, or `ui` folder.
- Do not invent a new shared helper for business rules that belong to `entities/ticket` or the owning page.
- Do not create speculative abstractions for future reuse. Extract only when reuse is real or the boundary is already stable.

When a page or widget grows, split by responsibility inside the slice:

```txt
src/pages/<slice>/
  api/      browser/server calls and response parsing
  model/    schemas, constants, derived state, pure helpers
  ui/       focused components
  index.ts  public slice entry point
```

For larger workflows, prefer several focused files over one clever file:

- `api/<thing>-client.ts` for browser calls and response parsing
- `model/<thing>-schema.ts` for page-owned schemas
- `model/<thing>-helpers.ts` for pure page-owned calculations
- `ui/<thing>-table.tsx` for table rendering
- `ui/<thing>-dialog.tsx` for one dialog
- `ui/<thing>-panel.tsx` for one panel

Before adding a large TSX file, ask whether it mixes concerns. Split it if it contains several of these at once:

- data fetching or mutations
- Zod schemas or API response parsing
- table column definitions and filtering
- form state and validation
- multiple dialogs or panels
- domain calculations
- low-level UI subcomponents

Practical size guide:

- Under 250 lines is usually fine.
- Around 400 lines, look for a natural split before adding more.
- Over 700 lines needs a strong reason and a comment explaining why it is intentionally kept together.
- Over 1,000 lines should almost always be split before handoff.

If a requested change naturally touches many responsibilities, it is better to create a small set of well-named files in the owning slice than to keep the diff artificially "simple" by hiding everything in one component.

Prefer names by domain purpose, not vague technical buckets. Use `payment-plan-editor.tsx`, `ticket-finance-summary.ts`, or `email-preview.ts`; avoid dumping unrelated code into `utils.tsx`, `helpers.tsx`, or `big-widget.tsx`.

### Tests For TypeScript Changes

When adding or changing TypeScript behavior, prefer focused tests near the owning boundary:

- domain parsing: `src/entities/**`
- API error parsing and page client behavior: `src/pages/**`
- env parsing: `src/shared/config`
- Stripe webhook/logging behavior: `src/app/stripe`

## Database Rules

Production Neon is live. Be extremely careful.

- Do not run SQL against production unless the user explicitly approves the exact action.
- Do not run destructive SQL against production unless there is a backup/restore plan.
- Do not delete tables, columns, rows, branches, computes, or projects unless the user explicitly asks and understands the consequence.
- Do not apply Drizzle migrations to production as part of exploratory work.
- Use a Neon branch for development and migration testing.
- Prefer additive, reversible migrations:
  - create tables/columns first
  - backfill safely
  - deploy compatible code
  - tighten constraints later
  - drop old data only after a separate approval

Expected safe development flow:

1. Create a Git feature branch.
2. Create or use a Neon development branch from production.
3. Point Vercel Preview environment variables to the Neon development branch.
4. Test migrations and app behavior in Preview.
5. Review generated SQL before production.
6. Apply production migration only after explicit approval.

## Vercel Environment Rules

Production Vercel deploys from `main`.

Preview deployments must not use production write credentials for:

- Neon production database
- Vercel Blob production store
- Stripe live mode
- Resend production email sending
- Telegram production bots

If Preview is wired to production secrets, do not use it for feature testing that writes data.

## Vercel Blob And QR Code Rules

QR codes are business-critical. They are sent to customers and stored as public Vercel Blob URLs in `ticket.qr_code`.

Current QR path pattern:

```txt
moment-qr/festival_2026/qr-code-${ticketId}.png
```

Important:

- Do not delete Vercel Blob objects.
- Do not overwrite existing QR blobs.
- Do not rotate Blob tokens without checking production QR generation.
- Do not change QR path conventions without a migration and compatibility plan.
- Remember that old customer emails may reference old Blob URLs.

Future QR uploads are configured to use deterministic paths:

```ts
addRandomSuffix: false
allowOverwrite: false
```

If a QR image is missing, it can usually be regenerated from:

```txt
https://dashboard.nailmoment.pl/ticket/{ticketId}
```

But preserving existing Blob URLs is still important because customers may already have emails containing those image URLs.

## External Services

The app touches several external systems:

- Stripe webhooks and ticket fulfillment
- Resend email sending
- Telegram bot routes
- Vercel Blob QR storage
- Logtail logging

Do not change webhook behavior, secrets, callback URLs, or production tokens without explicit user approval.

## Finance/Payment Work

The client currently depends on an external spreadsheet for finance and payment tracking. The app previously had a deleted payment installment feature. If restoring or rebuilding it:

- Work on a feature branch.
- Use a Neon development branch.
- Do not migrate production first.
- Avoid hardcoding spreadsheet-style `payment_1`, `payment_2`, etc. columns.
- Prefer a normalized payments table with one row per payment/installment.
- Preserve existing ticket and QR behavior.

Historical reference:

- Payment feature removed in commit `40a4650 Remove payment from app`.
- Last pre-removal version can be inspected with:

```bash
git show 40a4650^:shared/db/schema.ts
git show 40a4650^:shared/db/service/payment-installment-service.ts
git show 40a4650^:app/api/payment/route.ts
git show 40a4650^:widgets/ticket-card/ticket-payment.tsx
```

## When In Doubt

Pause and ask. The cost of a question is tiny compared with breaking production data, ticket emails, QR codes, or payment records.
