# Audience Vote Production Rollout

This document is the release plan for moving the Audience Vote Mini App,
dashboard, broadcasts, and Telegram bot entry flow from `develop` to
production.

Audience Vote replaces the old message-based Telegram voting implementation.
The old `speaker_vote`, `tg/speaker-bot`, and `tg/festival-bot` routes are not
part of the production launch path.

## Release Shape

- Source branch: `develop`
- Target branch: `main`
- Production app: `dashboard.nailmoment.pl`
- Production Mini App URL: `https://dashboard.nailmoment.pl/audience-vote`
- Operator dashboard URL: `https://dashboard.nailmoment.pl/audience-votes`
- Production database: Neon `main` branch for `nailmoment-neon`
- Production deploy host: Vercel project `nailmoment-dashboard`

The release includes:

- the new Audience Vote domain tables and routes;
- the protected Operator dashboard at `/audience-votes`;
- the public Telegram Mini App route at `/audience-vote`;
- the Telegram entry bot webhook at `/api/audience-vote/bot`;
- durable broadcast/canary delivery processing;
- scheduled processors for opening/closing votes and broadcast delivery;
- removal of legacy speaker/festival Telegram voting code.

## Serhii Steps

These are the human-in-the-loop steps that require production account access or
event decisions.

1. Create the production Audience Vote bot in BotFather.
   - Keep the bot token private.
   - Use this bot only for production.
   - Set commands for `/start` and `/vote` so both mean "open voting".

2. Collect Operator Telegram user ids.
   - Include every Operator who should receive broadcast preview and canary
     messages.
   - Store them as comma-separated numbers in
     `TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_IDS`.
   - Operators do not need to be in `telegram_users` to receive Operator
     canaries, but they should open the production bot once during smoke
     testing.

3. Approve the production database migration window.
   - Confirm whether the old 2025 Telegram voting data can be dropped now.
   - If not, apply only migrations `0022` through `0029` and `0031` before deploy and hold
     `0030_drop_legacy_telegram_votes.sql` until after cutover.

4. Confirm production media readiness.
   - Upload only optimized public media.
   - Photos should be 20 MB or less.
   - Videos should be 100 MB or less and mobile-playback friendly.

5. After deploy, test the production bot personally.
   - Send `/start`.
   - Open the Mini App.
   - Confirm the waiting screen or open vote loads.
   - Confirm the bot does not send candidate media in Telegram messages.

6. Before the first real broadcast, send a small test broadcast.
   - Confirm every configured Operator receives the Operator canary.
   - Confirm interrupt works from the dashboard.
   - Then create the real event broadcast.

## Agent / Operator Steps

These are the engineering and deployment steps.

1. Merge-down before release PR.
   - Fetch `origin/main`.
   - Merge `origin/main` into the `develop` release branch.
   - Resolve conflicts locally.
   - Run validation.
   - Push the reconciled `develop`.

2. Open the release PR.
   - Base: `main`
   - Head: `develop`
   - Keep the PR unmerged until migration and environment readiness are
     confirmed.
   - Include this rollout document in the PR body.

3. Verify production environment variables.
   - `TG_AUDIENCE_VOTE_BOT_TOKEN`
   - `TG_AUDIENCE_VOTE_WEBHOOK_SECRET`
   - `TG_AUDIENCE_VOTE_MINI_APP_URL=https://dashboard.nailmoment.pl/audience-vote`
   - `TG_AUDIENCE_VOTE_PROCESSOR_SECRET`
   - `CRON_SECRET` with the same value as `TG_AUDIENCE_VOTE_PROCESSOR_SECRET`
     unless a separate accepted processor secret is intentionally configured.
   - `TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_IDS`
   - Existing Blob, Neon, Better Auth, Stripe, Resend, and Logtail production
     variables remain unchanged unless separately approved.

4. Review and apply database migrations.
   - Take or verify a Neon production backup/restore point first.
   - Review every SQL file before applying.
   - Apply additive Audience Vote migrations first:
     - `drizzle/0022_audience_vote_core.sql`
     - `drizzle/0023_vote_candidates.sql`
     - `drizzle/0024_vote_candidate_media.sql`
     - `drizzle/0025_audience_vote_one_open.sql`
     - `drizzle/0026_audience_vote_current_votes.sql`
     - `drizzle/0027_audience_vote_broadcast_canary.sql`
     - `drizzle/0028_audience_vote_broadcast_retry_processor.sql`
     - `drizzle/0029_audience_vote_update_screen.sql`
     - `drizzle/0031_audience_vote_bot_settings.sql`
   - Treat `drizzle/0030_drop_legacy_telegram_votes.sql` as a separate cleanup
     step because it drops old Telegram voting tables:
     - `battle_vote_tg`
     - `speaker_vote_tg`
   - Do not run a blind "apply all" production migration if the legacy-table
     drop has not been explicitly approved.

5. Merge and deploy.
   - Merge the release PR into `main` only after env and migration readiness are
     confirmed.
   - Confirm how Vercel production deploys are triggered. `vercel.json` has
     Git deployments disabled, so production may need a manual Vercel deploy or
     promotion instead of an automatic Git deploy.
   - Confirm the deployed production commit matches the merged `main` commit.

6. Configure the production Telegram bot.
   - Set the webhook to:
     `https://dashboard.nailmoment.pl/api/audience-vote/bot`
   - Pass `TG_AUDIENCE_VOTE_WEBHOOK_SECRET` as Telegram `secret_token`.
   - Use `allowed_updates = ["message"]`.
   - Use `drop_pending_updates = true` during cutover so stale commands from
     testing do not replay into production.
   - Set the chat menu button URL to:
     `https://dashboard.nailmoment.pl/audience-vote`

7. Smoke test production.
   - Dashboard `/audience-votes` loads for an Operator.
   - Mini App preview from the dashboard loads without Telegram init data and
     does not save votes.
   - Production bot `/start` sends the Mini App button.
   - Production Mini App with real Telegram init data loads.
   - A draft vote can be created with candidates and media.
   - Opening validation blocks incomplete votes.
   - A complete vote can be opened and closed.
   - Results show aggregate totals only.
   - A test broadcast sends Operator canaries and can be interrupted.
   - Scheduled processors return 200 with the processor secret.

8. Cut over from old Telegram voting.
   - Disable old Telegram webhooks or point old bots away from the dashboard.
   - Keep old bot tokens out of new production env variables.
   - Apply `0030_drop_legacy_telegram_votes.sql` only after Serhii confirms old
     voting data is no longer needed, or after an export/backup is safely
     stored.

9. Post-launch monitoring.
   - Watch Vercel function logs for:
     - `/api/audience-vote/bot`
     - `/api/audience-vote/mini-app`
     - `/api/audience-vote/process`
     - `/api/audience-vote/broadcasts/process`
   - Watch Neon errors and slow queries during the first broadcast.
   - Confirm blocked Telegram users are marked inactive instead of repeatedly
     retried.
   - Confirm no duplicate broadcast messages are reported.

## Rollback Plan

If something goes wrong before real votes are collected:

1. Remove or disable the production Telegram webhook first.
2. Interrupt any running Audience Vote Broadcasts from the dashboard.
3. Promote the previous stable Vercel production deployment.
4. Do not delete Blob media.
5. Do not drop Audience Vote data.
6. Restore database state only from an approved Neon restore point if a data
   migration itself caused the issue.

If something goes wrong after real votes are collected:

1. Stop new Telegram entry traffic by disabling the webhook.
2. Close the open Audience Vote if voting must stop.
3. Preserve all `audience_vote_current_vote` rows.
4. Investigate from database snapshots and logs before changing production data.

## Final Launch Checklist

- [ ] `develop` contains current `main`.
- [ ] PR from `develop` to `main` is open and reviewed.
- [ ] Production env variables are set.
- [ ] Neon backup/restore point exists.
- [ ] Migrations `0022` through `0029` and `0031` are applied.
- [ ] Legacy cleanup migration `0030` is explicitly approved or intentionally
      held.
- [ ] Production deploy is live on `dashboard.nailmoment.pl`.
- [ ] Production Telegram webhook and menu are configured.
- [ ] Operator smoke test passed.
- [ ] Test broadcast canary and interrupt passed.
- [ ] Serhii approves first real vote opening.
