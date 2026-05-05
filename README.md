# Nail Moment Dashboard

Production operations dashboard for Nail Moment. Before touching data, deployments,
webhooks, Blob assets, QR codes, Stripe, Telegram, or email sending, read
`AGENTS.md`.

`AGENTS.md` is the source of truth for production safety, TypeScript boundaries,
Feature-Sliced Design placement, and validation expectations for future agents.

Run these before handing off TypeScript changes:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The build may print local Better Auth secret warnings when `.env.local` contains
placeholder values; those warnings are not type or build failures.
