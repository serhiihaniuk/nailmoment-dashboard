DO $$ BEGIN
  CREATE TYPE "audience_vote_broadcast_status_enum" AS ENUM (
    'canary_operator_pending',
    'canary_operator_sent',
    'canary_voters_sent',
    'ready',
    'interrupted',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "audience_vote_broadcast_delivery_stage_enum" AS ENUM (
    'operator_canary',
    'voter_canary',
    'normal'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "audience_vote_broadcast_delivery_status_enum" AS ENUM (
    'pending',
    'sent',
    'failed',
    'skipped'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audience_vote_broadcast" (
  "id" text PRIMARY KEY NOT NULL,
  "audience_vote_id" text NOT NULL,
  "message_text" text NOT NULL,
  "include_open_button" boolean DEFAULT false NOT NULL,
  "status" "audience_vote_broadcast_status_enum" DEFAULT 'canary_operator_pending' NOT NULL,
  "estimated_recipient_count" integer DEFAULT 0 NOT NULL,
  "canary_voter_limit" integer DEFAULT 25 NOT NULL,
  "operator_telegram_user_id" bigint NOT NULL,
  "next_stage_at" timestamp with time zone DEFAULT now() NOT NULL,
  "interrupted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "audience_vote_broadcast_audience_vote_id_audience_vote_id_fk"
    FOREIGN KEY ("audience_vote_id")
    REFERENCES "audience_vote"("id")
    ON DELETE cascade
    ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_broadcast_vote_idx"
  ON "audience_vote_broadcast" ("audience_vote_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_broadcast_status_idx"
  ON "audience_vote_broadcast" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_broadcast_created_at_idx"
  ON "audience_vote_broadcast" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audience_vote_broadcast_delivery" (
  "id" text PRIMARY KEY NOT NULL,
  "broadcast_id" text NOT NULL,
  "telegram_user_id" bigint NOT NULL,
  "stage" "audience_vote_broadcast_delivery_stage_enum" NOT NULL,
  "status" "audience_vote_broadcast_delivery_status_enum" DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "audience_vote_broadcast_delivery_broadcast_id_audience_vote_broadcast_id_fk"
    FOREIGN KEY ("broadcast_id")
    REFERENCES "audience_vote_broadcast"("id")
    ON DELETE cascade
    ON UPDATE no action,
  CONSTRAINT "audience_vote_broadcast_delivery_unique"
    UNIQUE("broadcast_id", "telegram_user_id", "stage")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_broadcast_delivery_broadcast_idx"
  ON "audience_vote_broadcast_delivery" ("broadcast_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_broadcast_delivery_status_idx"
  ON "audience_vote_broadcast_delivery" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_broadcast_delivery_broadcast_stage_status_idx"
  ON "audience_vote_broadcast_delivery" ("broadcast_id", "stage", "status");
