CREATE TABLE IF NOT EXISTS "audience_vote_bot_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "start_message" text NOT NULL,
  "start_button_text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
