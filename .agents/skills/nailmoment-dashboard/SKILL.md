---
name: nailmoment-dashboard
description: Develop, debug, review, document, migrate, or operate the Nail Moment Dashboard repository. Use when working in or discussing this repo, especially for finance autosave/payments, ticket/QR/email flows, Stripe webhooks, Telegram bots, Neon/Drizzle migrations, Vercel deployment, Feature-Sliced Design placement, TypeScript/Zod/Drizzle boundaries, or production-safety decisions.
---

# Nail Moment Dashboard

Use this skill as the repo-specific operating guide for `nailmoment-dashboard`.
Treat the app as a live production operations system.

## Start Here

1. Verify you are in the repo root by checking `package.json` has
   `"name": "nailmoment-dashboard"`.
2. Read `AGENTS.md` before any work that could touch data, deployments, Stripe,
   Telegram, email, QR codes, Blob assets, Vercel, Neon, or migrations.
3. Read `ARCHITECTURE.md` for the route-first map.
4. Load only the focused doc needed for the current task:

| Task | Read |
| --- | --- |
| Route/API location, schemas, side effects | `docs/routes.md` |
| Tables, relationships, migrations | `docs/data-model.md` |
| TypeScript/Zod/Drizzle/entity boundaries | `docs/type-boundaries.md` |
| Finance totals, autosave, discounts, payment plans | `docs/finance-flow.md` |
| Stripe webhook fulfillment and totals | `docs/stripe-flow.md` |
| Tickets, QR, Resend emails, PDF/email previews | `docs/ticket-email-qr-flow.md` |
| Telegram bots, voting, broadcasts | `docs/telegram-flow.md` |

For a compact task checklist, read `references/project-guide.md`.

Use the bundled repo-local support skills when relevant:

- TypeScript, Zod, Drizzle, strict typing, or runtime boundaries:
  `.agents/skills/typescript/SKILL.md`
- Feature-Sliced Design placement, slice ownership, or import boundaries:
  `.agents/skills/feature-sliced-design/SKILL.md`

## Search And Editing Rules

- Do not use `rg`; this repo's local shell environment blocks it.
- Search with `git ls-files`, `Select-String`, and PowerShell `Get-Content
  -LiteralPath`.
- Use `apply_patch` for manual edits.
- Do not revert user changes or unrelated dirty worktree changes.
- Prefer focused edits over broad refactors.

## Architecture Rules

Follow Feature-Sliced Design:

```txt
app -> pages -> widgets -> features -> entities -> shared
```

Current structure:

- `app/`: Next.js App Router wrappers.
- `src/app/`: app layout, providers, API route implementations, Stripe.
- `src/pages/`: route-level UI and page-owned model/API logic.
- `src/widgets/`: reused composite UI blocks.
- `src/entities/ticket/`: reusable ticket/finance/payment domain.
- `src/shared/`: DB, auth, env, email, UI kit, generic infrastructure.

Placement rules:

- Start page-only behavior in `src/pages/<slice>/`.
- Put reusable ticket/finance/payment rules in `src/entities/ticket/`.
- Keep route input schemas and Drizzle persistence shape in `src/shared/db/`.
- Keep business logic out of `src/shared` unless it is infrastructure.
- Import slices through public APIs when available.

## TypeScript Rules

- Treat `request.json()`, `response.json()`, route params, env vars, Stripe
  payloads, Telegram payloads, and DB-facing inputs as untrusted.
- Parse API bodies with `parseRequestJson()` and Zod schemas.
- Parse route params with `parseRouteParams()` and branded entity ID schemas.
- Parse browser API responses with `@/entities/ticket` parsers before React
  Query/UI consumes them.
- Use Drizzle-inferred types for persistence shapes, not as a replacement for
  browser-facing domain types.
- Avoid `any`, broad casts, double assertions, and non-null assertions.
- Preserve strict TypeScript settings.

## Production Safety

Stop and verify environment before any operation that can affect production:

- Neon migrations, SQL updates/deletes, branch changes, data imports.
- Vercel env vars, domains, deployments, Blob operations.
- Stripe webhook behavior or live payment fulfillment.
- Resend email sends to customers.
- Telegram bot broadcasts or webhook changes.
- QR path conventions or existing QR Blob URLs.

Never apply production migrations or destructive SQL as exploratory work.
Prefer a Neon development branch and reviewed SQL for DB changes.

## Validation

Run the relevant checks before handoff. For broad TypeScript changes:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For narrow changes, run the focused tests first:

```bash
npm test -- finance
npm test -- stripe
npm test -- ticket
```

Always report which checks ran and which did not.
