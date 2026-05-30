# Telegram Flow

Telegram integration is now limited to the Audience Vote Mini App entry bot and
the Audience Vote broadcast processor. The old message-based festival/speaker
voting bots have been removed from the active codebase.

Telegram webhook routes are external routes handled by Grammy. They are not
Better Auth protected dashboard routes.

## Main Files

| Concern | Files |
| --- | --- |
| Audience Vote bot entry webhook | `src/app/api-routes/audience-vote/bot/route.ts` |
| Audience Vote Mini App route | `src/pages/audience-vote-mini-app/*` |
| Audience Vote Mini App API | `src/app/api-routes/audience-vote/mini-app/route.ts` |
| Audience Vote dashboard | `src/pages/audience-votes/*` |
| Audience Vote domain model | `src/entities/audience-vote/*` |
| Audience Vote bot settings API | `src/app/api-routes/audience-vote/bot-settings/route.ts` |
| Telegram helpers | `src/shared/telegram/*` |
| DB schema | `src/shared/db/schema.ts` |
| Env readers | `src/shared/config/env.ts` |

## Entry Points

```txt
Telegram
  |
  +- POST /api/audience-vote/bot
       -> src/app/api-routes/audience-vote/bot/route.ts
```

The bot route ends with:

```ts
webhookCallback(bot, "std/http")
```

## Audience Vote Mini App

The voter-facing Audience Vote flow uses:

```txt
GET /audience-vote
  -> src/pages/audience-vote-mini-app

GET /api/audience-vote/mini-app
  -> reads bot=main|final_battle or x-audience-vote-telegram-bot
  -> validates Telegram Mini App initData with the selected bot token
  -> upserts/reactivates the Telegram Voter for the selected bot
  -> returns the selected bot's open public Audience Vote feed or a safe update screen fallback
```

This API is intentionally not Better Auth protected. It trusts only server-side
Telegram `initData` validation and never returns Vote Candidate Internal Names
or Operator-only media fields.

Dashboard Operators can open `/audience-vote?preview=1` from `/audience-votes`
to review the Mini App feed without Telegram `initData`. That mode requires a
valid Better Auth dashboard session, sends a preview-only request header to the
Mini App GET API, and disables voting in the client. Vote saves still require
real Telegram `initData`.

The open vote feed normally ends with a public Nail Moment ticket CTA. Its link uses
Mini App-specific UTM tags (`utm_source=telegram`, `utm_medium=mini_app`,
`utm_campaign=audience_vote`, `utm_content=bottom_ticket_cta`,
`utm_term=ticket_button`) so ticket attribution can distinguish it from
broadcast landing buttons. Final battle votes hide this ticket CTA and the
post-vote ticket modal.

The update screen fallback is Operator-managed from the protected dashboard at
`/audience-votes`. It stores one current title/message in
`audience_vote_update_screen`; if that row does not exist yet, the Mini App
falls back to the built-in Ukrainian default without writing from the public
route.

## Audience Vote Bot

The Audience Vote Telegram bot is only an entry point to the Mini App. It is not
a Telegram-message voting surface and does not send Vote Candidate Media.

```txt
POST /api/audience-vote/bot
  -> matches x-telegram-bot-api-secret-token against configured bot secrets
  -> handles /start and /vote through Grammy
  -> upserts/reactivates the Telegram Voter for the matched bot
  -> sends the Operator-managed Mini App entry message with the matched bot web_app URL
```

Operators configure the `/start` and `/vote` reply from the protected
dashboard through:

```txt
GET/PATCH /api/audience-vote/bot-settings
  -> src/app/api-routes/audience-vote/bot-settings/route.ts
  -> stores one current row in audience_vote_bot_settings
```

The bot route falls back to the built-in Ukrainian entry message and button if
`audience_vote_bot_settings` is not migrated yet. That keeps the production bot
working during deploy/migration ordering.

Required scoped env names:

```txt
TG_AUDIENCE_VOTE_BOT_TOKEN
TG_AUDIENCE_VOTE_WEBHOOK_SECRET
TG_AUDIENCE_VOTE_MINI_APP_URL
TG_AUDIENCE_VOTE_FINAL_BATTLE_BOT_TOKEN
TG_AUDIENCE_VOTE_FINAL_BATTLE_WEBHOOK_SECRET
TG_AUDIENCE_VOTE_FINAL_BATTLE_MINI_APP_URL
TG_AUDIENCE_VOTE_PROCESSOR_SECRET
TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_IDS
```

The final battle bot env is optional as a group. If any one final battle value
is set, all three must be set. Dashboard-created Audience Votes persist
`telegram_bot` as `main` or `final_battle`; broadcasts inherit that value from
the vote and send through the matching bot token/Mini App URL. The scoped bot
config appends `bot=main` or `bot=final_battle` to the configured Mini App URL
before sending Telegram web_app buttons. Existing voters remain attached to the
main bot until they open `/start`, `/vote`, or the Mini App from the final
battle bot.

Telegram webhook and bot menu setup is manual. Do not configure production
Telegram webhooks during development work. Use separate dev/prod bots and only
point the dev bot at Preview deployments.

## Audience Vote Broadcasts

Audience Vote Broadcasts use durable per-voter delivery rows instead of a
single long Telegram send loop.

```txt
Operator confirms broadcast
  |
  +- create audience_vote_broadcast
  +- create audience_vote_broadcast_delivery rows
  +- immediately kick safe processor
       |
       +- send Operator canary to every configured Operator
       +- wait two minutes
       +- send 25-voter canary plus every configured Operator
       +- wait two minutes
       +- send normal deliveries in batches of 25

Vercel Cron
  |
  +- GET /api/audience-vote/process
  |    |
  |    +- require processor secret
  |    +- close expired open Audience Votes
  |    +- open the first valid scheduled Audience Vote whose start time is due
  |    +- create that vote's scheduled opening broadcast, if configured
  |
  +- GET /api/audience-vote/broadcasts/process
       |
       +- require processor secret
       +- process due unsent canary/normal rows through the same safe path
```

Operators can also attach an opening broadcast while scheduling an Audience
Vote. The message is stored on `audience_vote` and converted into a normal
`audience_vote_broadcast` only after the vote opens, either through the manual
open button or the lifecycle processor. The generated broadcast id is
`opening_<audience_vote_id>`, so retries and cron recovery are idempotent while
still using the same canary, interrupt, delivery-row, and Telegram send path as
manual broadcasts.

Manual and opening broadcasts can include Telegram inline buttons for the
Audience Vote Mini App and for the public Nail Moment landing page
with Telegram broadcast UTM tags (`utm_source=telegram`, `utm_medium=bot`,
`utm_campaign=audience_vote`, `utm_content=broadcast_landing_button`). The
button choices are persisted on the broadcast row so delayed canary and normal
delivery batches send the same markup the Operator previewed.
The broadcast row also persists `telegram_bot`, so delayed delivery batches keep
using the same bot selected for the Audience Vote.

The processor checks the broadcast status from the database before each phase
and before every recipient send. Setting a broadcast to `interrupted` is the
DB-backed kill switch: future unsent deliveries are skipped, while already sent
Telegram messages stay recorded as sent.

Each delivery is attempted at most once. A processor claim marks the delivery
failed unless a successful Telegram provider handoff is recorded afterward.
This avoids duplicate Telegram messages when a provider response is ambiguous or
a serverless invocation crashes between the Telegram call and the DB update.
Telegram forbidden/block-style failures also mark that Telegram Voter inactive
for that bot so future broadcasts from the same bot do not target them.

Internal scheduled processing requires `TG_AUDIENCE_VOTE_PROCESSOR_SECRET`.
Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`, so production should
set `CRON_SECRET` to the same internal processor secret or another accepted
equivalent.

Manual webhook command shape:

```powershell
$token = "<bot token>"
$secret = "<TG_AUDIENCE_VOTE_WEBHOOK_SECRET>"
$webhookUrl = "https://<deployment>/api/audience-vote/bot"

Invoke-RestMethod -Method Post `
  -Uri "https://api.telegram.org/bot$token/setWebhook" `
  -ContentType "application/json" `
  -Body (@{
    url = $webhookUrl
    secret_token = $secret
    allowed_updates = @("message")
    drop_pending_updates = $true
  } | ConvertTo-Json)
```

Manual Mini App menu command shape:

```powershell
$token = "<bot token>"
$miniAppUrl = "https://<deployment>/audience-vote"

Invoke-RestMethod -Method Post `
  -Uri "https://api.telegram.org/bot$token/setChatMenuButton" `
  -ContentType "application/json" `
  -Body (@{
    menu_button = @{
      type = "web_app"
      text = "Голосування"
      web_app = @{ url = $miniAppUrl }
    }
  } | ConvertTo-Json -Depth 5)
```

## Env

Telegram tokens are read through scoped env readers:

```txt
readTelegramAudienceVoteBotToken()
readTelegramAudienceVoteWebhookSecret()
readTelegramAudienceVoteMiniAppUrl()
readTelegramAudienceVoteBotConfig()
readConfiguredTelegramAudienceVoteBotConfigs()
readTelegramAudienceVoteProcessorSecret()
readTelegramAudienceVoteOperatorTelegramIds()
```

Owner:

```txt
src/shared/config/env.ts
```

## Notes

- Telegram text uses Markdown escaping helpers before sending formatted
  messages.
- Bot route code is integration-heavy and lives in the app route layer because
  Grammy handlers are route/integration code.
- Be careful with broadcast commands in production; they message real users.
