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

As of this writing, there is no fully established development environment. Production is the only real environment unless a Neon development branch and Vercel Preview environment have been explicitly created and wired up.

## Critical Rule

Do not make destructive or risky production changes casually. This includes database migrations, data updates, data deletes, Vercel Blob deletes, environment variable changes, domain changes, deployment config changes, and webhook changes.

If a task might affect production data, production users, sent ticket emails, QR codes, Stripe, Telegram bots, or Vercel Blob assets, stop and verify the environment first.

## Git Rules

- `main` is production.
- Do not push directly to `main` unless the user explicitly asks for it.
- For feature work, create a branch first.
- Prefer branch names like `codex/<short-task-name>` unless the user asks for another name.
- Before committing, run the relevant checks:
  - `npm run lint`
  - `npm test`
  - `npm run build`
- Before pushing, confirm `git status --short --branch`.

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

