# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This is a single-context repo.

- Domain language lives in `CONTEXT.md` at the repo root.
- ADRs live in `docs/adr/`.
- `CONTEXT.md` and `docs/adr/` are created lazily by `grill-with-docs` when terms or decisions are resolved.

If any of these files do not exist, proceed silently. Do not suggest creating them up front unless the user is explicitly running a domain-grilling or decision-recording workflow.

## Read Order

Before exploring a non-trivial area:

1. Read root `CONTEXT.md` if it exists.
2. Read ADRs in `docs/adr/` that touch the area.
3. Read the focused repo docs linked from `ARCHITECTURE.md`.

For this production dashboard, also respect `AGENTS.md` before touching data, deployments, Stripe, Telegram, email, QR codes, Vercel Blob, Neon, or Vercel configuration.

## Use The Glossary

When naming a domain concept in an issue title, refactor proposal, hypothesis, test name, or implementation plan, use the term defined in `CONTEXT.md`.

If a useful concept is missing from the glossary, do not invent permanent language silently. Note it for `grill-with-docs`, then add it to `CONTEXT.md` only when the term is resolved.

## ADR Conflicts

If a recommendation contradicts an existing ADR, surface it explicitly:

> Contradicts ADR-0007, but may be worth reopening because...

Do not silently override documented decisions.
