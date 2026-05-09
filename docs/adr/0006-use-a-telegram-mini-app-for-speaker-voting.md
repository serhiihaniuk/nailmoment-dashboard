# Use A Telegram Mini App For Audience Voting

The new audience voting workflow will use one Telegram Mini App as the primary voting surface for sequential speaker, battle, and final battle votes instead of maintaining separate bots or sending and editing many Telegram bot media messages. Last year's bot-message implementation suffered from webhook retries, serverless timeouts, duplicate sends, and poor slider latency; a Mini App moves browsing and voting into a normal web UI while keeping the Telegram bot responsible for entry points, voter registration, broadcasts, and fallback help.

**Consequences**

- Vote candidate media needs stable web-hosted URLs, not only Telegram `file_id`s.
- Vote candidate media should be optimized before dashboard upload, with videos targeting 100 MB or less for mobile Mini App playback.
- Vote candidate media uploads should use Vercel Blob client uploads so large media does not pass through a serverless request body.
- Vote candidate media Blob paths should be deterministic by app IDs with no random Vercel suffix and no overwrites; replacements create new media records and paths.
- Voting API requests from the Mini App are not Better Auth protected, but must validate Telegram Mini App `initData` on the server before trusting the voter identity.
- Telegram webhook handlers should validate Telegram's webhook secret token, then stay small, fast, and idempotent.
- Broadcast delivery must use durable per-recipient state, canary stages, small batches, and a database-backed kill switch checked before future sends.
- Internal broadcast processing endpoints must require an internal secret so public requests cannot trigger Telegram sends.
- Telegram webhook and bot menu configuration should be handled by explicit manual setup, not dashboard UI.
- The new Audience Vote system should use a new Telegram bot rather than reusing last year's voting bots.
- New bot configuration should use scoped environment variables such as `TG_AUDIENCE_VOTE_BOT_TOKEN`, `TG_AUDIENCE_VOTE_WEBHOOK_SECRET`, `TG_AUDIENCE_VOTE_MINI_APP_URL`, `TG_AUDIENCE_VOTE_PROCESSOR_SECRET`, and `TG_AUDIENCE_VOTE_OPERATOR_TELEGRAM_IDS`.
- Development and production should use separate Audience Vote Telegram bots or, at minimum, separate environment configuration that never points preview testing at the production voting bot.
