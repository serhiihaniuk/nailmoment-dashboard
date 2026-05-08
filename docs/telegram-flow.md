# Telegram Flow

> Legacy note: Existing Telegram voting routes are leftovers from a previous event season. Do not deepen or refactor this flow; future Telegram voting should be designed as a fresh implementation. See [ADR-0001](adr/0001-treat-telegram-voting-as-legacy-pending-rewrite.md).

Telegram routes are external webhook routes handled by Grammy. They are not
Better Auth protected dashboard routes.

## Main Files

| Concern | Files |
| --- | --- |
| Festival bot route | `src/app/api-routes/tg/festival-bot/route.ts` |
| Festival bot constants | `src/app/api-routes/tg/festival-bot/const.ts` |
| Speaker/battle bot route | `src/app/api-routes/tg/speaker-bot/route.ts` |
| Voting domain data | `src/entities/voting/model/voting.ts` |
| Audience Vote bot entry webhook | `src/app/api-routes/audience-vote/bot/route.ts` |
| Audience Vote Mini App route | `src/pages/audience-vote-mini-app/*` |
| Audience Vote Mini App API | `src/app/api-routes/audience-vote/mini-app/route.ts` |
| Speaker vote results API | `src/app/api-routes/speaker_vote/route.ts` |
| Speaker vote results UI | `src/pages/speaker-vote/*` |
| DB schema | `src/shared/db/schema.ts` |
| Env readers | `src/shared/config/env.ts` |

## Entry Points

```txt
Telegram
  |
  +- POST /api/tg/festival-bot
  |    -> src/app/api-routes/tg/festival-bot/route.ts
  |
  +- POST /api/tg/speaker-bot
  |    -> src/app/api-routes/tg/speaker-bot/route.ts
  |
  +- POST /api/audience-vote/bot
       -> src/app/api-routes/audience-vote/bot/route.ts
```

Both routes end with:

```ts
webhookCallback(bot, "std/http")
```

## Festival Bot

The festival bot uses a fixed contestant set from:

```txt
src/app/api-routes/tg/festival-bot/const.ts
```

Main commands/actions:

- `/start`: saves Telegram user and sends welcome messages.
- `/reset`: removes the user's existing festival vote.
- `show_votes`: starts contestant browsing/voting.
- `slide:prev|next:*`: changes contestant media.
- `vote:*`: records vote if the user has not already voted.
- `reset_vote:*`: removes current vote.
- `/send_message`: admin broadcast command.
- photo/video message handlers: return Telegram `file_id` for setup work.

Data written:

- `telegram_users`
- `battle_vote_tg`

Festival voting stores a fixed category id:

```txt
festival
```

## Speaker / Battle Bot

The speaker/battle bot uses static voting domain data from:

```txt
src/entities/voting/model/voting.ts
```

Main concepts:

- active battle category;
- contestants with photo file ids;
- one vote per Telegram user per active category;
- reset vote action;
- schedule/main menu actions;
- admin broadcast command.

Data written:

- `telegram_users`
- `battle_vote_tg`

## Broadcasts

Broadcast commands use Vercel `waitUntil()`:

```txt
Telegram command response
  |
  +- acknowledge command quickly
  |
  +- waitUntil(runBroadcast())
       |
       +- select candidate active users
       +- atomically update lastBroadcastSentAt
       +- send Telegram message
       +- deactivate blocked users on 403
```

The atomic update prevents two concurrent serverless invocations from sending
the same broadcast to the same user inside the throttle window.

## Speaker Vote Dashboard

```txt
GET /api/speaker_vote
  |
  +- Better Auth session check
  +- group speaker_vote_tg by voted_for_id
  +- return [{ video, total }]
  |
  v
src/pages/speaker-vote
```

## Audience Vote Mini App

The new voter-facing Audience Vote flow uses:

```txt
GET /audience-vote
  -> src/pages/audience-vote-mini-app

GET /api/audience-vote/mini-app
  -> validates Telegram Mini App initData with TG_AUDIENCE_VOTE_BOT_TOKEN
  -> upserts/reactivates the Telegram Voter
  -> returns the open public Audience Vote feed or the Operator-managed update screen
```

This API is intentionally not Better Auth protected. It trusts only server-side
Telegram `initData` validation and never returns Vote Candidate Internal Names
or Operator-only media fields. When no Audience Vote is open, it may include
next planned Audience Vote context, but it does not return result totals.

## Audience Vote Bot

The new Audience Vote Telegram bot is only an entry point to the Mini App. It is
not a Telegram-message voting surface and does not send Vote Candidate Media.

```txt
POST /api/audience-vote/bot
  -> validates x-telegram-bot-api-secret-token with TG_AUDIENCE_VOTE_WEBHOOK_SECRET
  -> handles /start and /vote through Grammy
  -> upserts/reactivates the Telegram Voter
  -> sends a Ukrainian Mini App entry message with a web_app button
```

Required scoped env names:

```txt
TG_AUDIENCE_VOTE_BOT_TOKEN
TG_AUDIENCE_VOTE_WEBHOOK_SECRET
TG_AUDIENCE_VOTE_MINI_APP_URL
TG_AUDIENCE_VOTE_PROCESSOR_SECRET
TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_ID
```

Telegram webhook and bot menu setup is manual. Do not configure production
Telegram webhooks during development work. Use separate dev/prod bots and only
point the dev bot at Preview deployments.

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
readTelegramFestivalBotToken()
readTelegramSpeakerBotToken()
readTelegramAudienceVoteBotToken()
readTelegramAudienceVoteWebhookSecret()
readTelegramAudienceVoteMiniAppUrl()
readTelegramAudienceVoteProcessorSecret()
readTelegramAudienceVoteOperatorTelegramId()
```

Owner:

```txt
src/shared/config/env.ts
```

## Notes

- Telegram text uses Markdown escaping helpers before sending formatted
  messages.
- Bot route code is currently integration-heavy and lives in the app route
  layer because Grammy handlers are route/integration code.
- Be careful with broadcast commands in production; they message real users.
