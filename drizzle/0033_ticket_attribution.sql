CREATE TABLE IF NOT EXISTS "ticket_attribution" (
  "id" text PRIMARY KEY NOT NULL,
  "ticket_id" text,
  "stripe_session_id" text NOT NULL,
  "source" text DEFAULT 'stripe_success_redirect' NOT NULL,
  "utm_source" text,
  "utm_medium" text,
  "utm_campaign" text,
  "utm_content" text,
  "utm_term" text,
  "landing_page" text,
  "referrer" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ticket_attribution_ticket_id_ticket_id_fk"
    FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_attribution_stripe_session_id_unique"
  ON "ticket_attribution" USING btree ("stripe_session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_attribution_ticket_id_unique"
  ON "ticket_attribution" USING btree ("ticket_id");
