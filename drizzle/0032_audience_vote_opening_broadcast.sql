ALTER TABLE "audience_vote"
  ADD COLUMN IF NOT EXISTS "opening_broadcast_message_text" text;
--> statement-breakpoint
ALTER TABLE "audience_vote"
  ADD COLUMN IF NOT EXISTS "opening_broadcast_include_open_button" boolean DEFAULT true NOT NULL;
