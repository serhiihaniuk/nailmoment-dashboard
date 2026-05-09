# Audience Vote Implementation Plan

This plan captures the agreed direction for the Telegram Mini App voting
system. It replaced the old message-based Telegram voting approach, which has
been removed from the active codebase.

## Agent Handoff

Every implementation agent should read this document before starting an
Audience Vote issue. The GitHub issue bodies are intentionally vertical slices;
this plan carries the cross-slice context, vocabulary, safety rules, and
external-service assumptions.

Read in this order:

1. `AGENTS.md`
2. `CONTEXT.md`
3. `docs/adr/0006-use-a-telegram-mini-app-for-speaker-voting.md`
4. `docs/audience-vote-plan.md`
5. The assigned GitHub issue

Reference decisions:

- Domain language: `CONTEXT.md`
- Architecture decision: `docs/adr/0006-use-a-telegram-mini-app-for-speaker-voting.md`
- GitHub issue slice set: #55-#66

## Goals

- Use one **Audience Vote Mini App** for sequential speaker, battle category,
  and final battle votes.
- Keep the Telegram bot as an entry point only: `/start`, `/vote`, and bot menu
  open the Mini App.
- Store all durable voting, media, voter, and broadcast state in Neon.
- Use Vercel Blob for public **Vote Candidate Media**.
- Keep webhook handlers small, authenticated, fast, and idempotent.
- Protect voter APIs with Telegram Mini App `initData` validation, not Better
  Auth.
- Keep dashboard Operator workflows Better Auth protected.

## Non-Goals

- Do not reuse or deepen last year's Telegram voting routes.
- Do not build multiple voting bots for each stage.
- Do not show live or final results to voters.
- Do not build vote export, voter list UI, full i18n, drag-and-drop ordering, or
  media transcoding in Vercel for launch.
- Do not hard-delete Blob media during event operations.

## Domain Shape

An **Audience Vote** represents one voting stage. Supported kinds are:

- `speaker`
- `battle`
- `final_battle`

Each battle category is its own **Battle Category Vote**. Audience Votes are
sequential; only one may be open at a time.

An Audience Vote has:

- public title;
- kind;
- status: `draft`, `scheduled`, `open`, or `closed`;
- optional planning/display window;
- one or more **Vote Candidates**.

A **Vote Candidate** has:

- Operator-defined display order;
- public display name;
- optional Operator-only internal name;
- optional public caption;
- one or more public **Vote Candidate Media** items.

Battle votes use anonymous public display names. Speaker votes may use real
speaker names.

## Media Rules

- Media uses public Vercel Blob URLs.
- Photos must be 20 MB or less.
- Videos must be 100 MB or less and prepared for mobile playback before upload.
- Uploads use Vercel Blob client uploads.
- Blob paths are deterministic by app IDs, use no random Vercel suffix, and do
  not overwrite existing media.
- Replacing media creates a new media record/path; old media remains preserved
  for later explicit cleanup.
- Media displays in upload order.

## Operator Dashboard

Operators can:

- create draft or scheduled Audience Votes;
- manage Vote Candidates and media;
- open a vote only when validation passes;
- close a vote with confirmation;
- view aggregate results;
- edit the Audience Vote Update Screen;
- create and confirm broadcasts;
- interrupt broadcasts.

Opening validation requires:

- title;
- kind;
- at least two active Vote Candidates;
- active media for each active Vote Candidate;
- no other open Audience Vote.

Closed Audience Votes cannot be reopened. Closing immediately stops new votes
and vote changes.

## Mini App

The Mini App is the primary voting surface.

When an Audience Vote is open, it shows:

- a vertical Instagram-like feed;
- one card per Vote Candidate;
- in-card media carousel;
- display name, optional caption, and vote action;
- current selected candidate state for the voter.

When no Audience Vote is open, it shows the Operator-managed **Audience Vote
Update Screen**.

The Mini App:

- validates Telegram `initData` through server APIs;
- upserts/reactivates the Telegram Voter from verified Telegram user id and
  optional username;
- never exposes Vote Candidate Internal Name;
- never shows vote totals or final results.

## Voting Rules

- A Telegram Voter can vote once in each sequential Audience Vote.
- The current vote is stored as the source of truth.
- Voters may change their vote until the Audience Vote closes.
- Saving the same vote again is a successful no-op.
- Historical vote changes are not preserved.
- Results are calculated from current vote rows.

## Telegram Bot

Use a new Telegram bot for the Audience Vote system.

The bot:

- validates Telegram webhook secret token headers;
- records Telegram Voters idempotently on `/start` and `/vote`;
- sends a Ukrainian Mini App entry message/button;
- does not send candidate media;
- does not implement voting in Telegram messages.

Telegram webhook and bot menu setup is manual, not dashboard-managed.

Scoped env names:

- `TG_AUDIENCE_VOTE_BOT_TOKEN`
- `TG_AUDIENCE_VOTE_WEBHOOK_SECRET`
- `TG_AUDIENCE_VOTE_MINI_APP_URL`
- `TG_AUDIENCE_VOTE_PROCESSOR_SECRET`
- `TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_IDS`

Development and production should use separate Audience Vote bots, or at
minimum separate env configuration that never points preview testing at the
production voting bot.

## Broadcasts

An **Audience Vote Broadcast** targets all active Telegram Voters who have
opened the voting bot. Broadcasts contain message text and may include an
open-voting button.

Broadcast safety flow:

1. Operator drafts broadcast.
2. Dashboard previews message and estimated recipient count.
3. Operator confirms.
4. System sends to Operator Telegram account only.
5. Wait two minutes.
6. If not interrupted, send to 25 active Telegram Voters plus Operator.
7. Wait two more minutes.
8. If not interrupted, normal batch delivery begins.

Delivery rules:

- use durable per-voter delivery rows;
- process small batches, around 25 deliveries per run;
- configured Operators receive both canary phases, but Operators and voter-canary
  recipients are excluded from normal delivery so they do not receive the same
  broadcast twice;
- attempt each delivery at most once to avoid duplicate Telegram messages after ambiguous provider failures;
- mark blocked/restricted voters inactive for future broadcasts;
- allow dashboard-only interrupt;
- interrupt must stop all future unsent deliveries;
- already sent Telegram messages remain sent;
- immediate dashboard kick and scheduled processor use the same safe
  processing path;
- internal processor endpoints require `TG_AUDIENCE_VOTE_PROCESSOR_SECRET`.

## Issue Breakdown

| Issue | Owner | Type | Summary |
| --- | --- | --- | --- |
| #55 | Agent | AFK | Core model and dashboard list |
| #56 | Agent | AFK | Vote candidates and public/private labels |
| #57 | Agent | AFK | Vote candidate media upload to Blob |
| #58 | Agent | AFK | Open, close, and validate votes |
| #59 | Agent | AFK | Aggregate results dashboard |
| #60 | Agent | AFK | Mini App feed and Telegram identity boundary |
| #61 | Agent | AFK | Save and change votes from Mini App |
| #62 | Serhii + Agent | HITL | New Telegram bot entry webhook |
| #63 | Agent | AFK | Update screen content |
| #64 | Agent | AFK | Broadcast confirmation and canary |
| #65 | Agent | AFK | Broadcast retry and kill switch |
| #66 | Serhii + Agent | HITL | Dev environment and launch verification |

## Production Safety

Work starts in the existing Dev Environment and Neon dev setup. Do not migrate
production, configure production Telegram webhooks, or point preview testing at
production bot/database credentials without explicit Serhii approval.
