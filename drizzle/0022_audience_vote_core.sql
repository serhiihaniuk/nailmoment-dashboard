DO $$ BEGIN
  CREATE TYPE "audience_vote_kind_enum" AS ENUM (
    'speaker',
    'battle',
    'final_battle'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "audience_vote_status_enum" AS ENUM (
    'draft',
    'scheduled',
    'open',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audience_vote" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" "audience_vote_kind_enum" NOT NULL,
  "title" text NOT NULL,
  "status" "audience_vote_status_enum" DEFAULT 'draft' NOT NULL,
  "window_start" timestamp with time zone,
  "window_end" timestamp with time zone,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_status_idx"
  ON "audience_vote" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_created_at_idx"
  ON "audience_vote" ("created_at");

