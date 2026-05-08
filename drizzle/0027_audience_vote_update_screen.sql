CREATE TABLE IF NOT EXISTS "audience_vote_update_screen" (
  "id" text PRIMARY KEY NOT NULL,
  "headline" text NOT NULL,
  "body" text NOT NULL,
  "button_label" text,
  "button_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
