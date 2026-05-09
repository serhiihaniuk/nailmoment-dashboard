CREATE TABLE IF NOT EXISTS "audience_vote_update_screen" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
