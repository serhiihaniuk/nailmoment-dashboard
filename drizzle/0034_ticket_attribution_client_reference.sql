ALTER TABLE "ticket_attribution"
  ALTER COLUMN "stripe_session_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ticket_attribution"
  ADD COLUMN IF NOT EXISTS "client_reference_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_attribution_client_reference_id_unique"
  ON "ticket_attribution" USING btree ("client_reference_id");
