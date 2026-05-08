CREATE TABLE IF NOT EXISTS "audience_vote_current_vote" (
  "id" text PRIMARY KEY NOT NULL,
  "audience_vote_id" text NOT NULL,
  "candidate_id" text NOT NULL,
  "telegram_user_id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "audience_vote_current_vote_audience_vote_id_audience_vote_id_fk"
    FOREIGN KEY ("audience_vote_id")
    REFERENCES "audience_vote"("id")
    ON DELETE cascade
    ON UPDATE no action,
  CONSTRAINT "audience_vote_current_vote_candidate_id_vote_candidate_id_fk"
    FOREIGN KEY ("candidate_id")
    REFERENCES "vote_candidate"("id")
    ON DELETE cascade
    ON UPDATE no action,
  CONSTRAINT "audience_vote_current_vote_user_fk"
    FOREIGN KEY ("telegram_user_id")
    REFERENCES "telegram_users"("telegram_user_id")
    ON DELETE no action
    ON UPDATE no action,
  CONSTRAINT "audience_vote_current_vote_vote_voter_unique"
    UNIQUE("audience_vote_id", "telegram_user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_current_vote_audience_vote_idx"
  ON "audience_vote_current_vote" ("audience_vote_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_vote_current_vote_candidate_idx"
  ON "audience_vote_current_vote" ("candidate_id");
