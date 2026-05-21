ALTER TABLE "audience_vote_broadcast"
  ADD COLUMN IF NOT EXISTS "include_landing_button" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "audience_vote"
  ADD COLUMN IF NOT EXISTS "opening_broadcast_include_landing_button" boolean DEFAULT false NOT NULL;
