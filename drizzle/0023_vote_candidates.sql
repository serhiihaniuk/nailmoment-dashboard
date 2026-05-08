CREATE TABLE IF NOT EXISTS "vote_candidate" (
  "id" text PRIMARY KEY NOT NULL,
  "audience_vote_id" text NOT NULL,
  "display_order" integer DEFAULT 1 NOT NULL,
  "display_name" text NOT NULL,
  "internal_name" text,
  "caption" text,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vote_candidate_audience_vote_id_audience_vote_id_fk"
    FOREIGN KEY ("audience_vote_id")
    REFERENCES "audience_vote"("id")
    ON DELETE cascade
    ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vote_candidate_audience_vote_idx"
  ON "vote_candidate" ("audience_vote_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vote_candidate_audience_vote_order_idx"
  ON "vote_candidate" ("audience_vote_id", "display_order");
