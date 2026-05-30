DO $$ BEGIN
  CREATE TYPE "audience_vote_telegram_bot_enum" AS ENUM (
    'main',
    'final_battle'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "audience_vote"
  ADD COLUMN IF NOT EXISTS "telegram_bot" "audience_vote_telegram_bot_enum" DEFAULT 'main' NOT NULL;
--> statement-breakpoint
ALTER TABLE "audience_vote_broadcast"
  ADD COLUMN IF NOT EXISTS "telegram_bot" "audience_vote_telegram_bot_enum" DEFAULT 'main' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_user_bot_access" (
  "telegram_bot" "audience_vote_telegram_bot_enum" NOT NULL,
  "telegram_user_id" bigint NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "telegram_user_bot_access_pk"
    PRIMARY KEY ("telegram_bot", "telegram_user_id"),
  CONSTRAINT "telegram_user_bot_access_telegram_user_id_telegram_users_telegram_user_id_fk"
    FOREIGN KEY ("telegram_user_id")
    REFERENCES "telegram_users"("telegram_user_id")
    ON DELETE cascade
    ON UPDATE no action
);
--> statement-breakpoint
INSERT INTO "telegram_user_bot_access" (
  "telegram_bot",
  "telegram_user_id",
  "is_active",
  "last_seen_at",
  "created_at",
  "updated_at"
)
SELECT
  'main',
  "telegram_user_id",
  "is_active",
  "last_broadcast_sent_at",
  "created_at",
  now()
FROM "telegram_users"
ON CONFLICT ("telegram_bot", "telegram_user_id") DO NOTHING;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_user_bot_access_bot_idx"
  ON "telegram_user_bot_access" ("telegram_bot");
