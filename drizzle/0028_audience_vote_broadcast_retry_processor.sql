ALTER TYPE "audience_vote_broadcast_status_enum"
  ADD VALUE IF NOT EXISTS 'completed';
--> statement-breakpoint
ALTER TABLE "audience_vote_broadcast_delivery"
  ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_broadcast_delivery_due_idx"
  ON "audience_vote_broadcast_delivery" ("stage", "status", "next_attempt_at");
