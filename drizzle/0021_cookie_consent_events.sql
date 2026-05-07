DO $$ BEGIN
  CREATE TYPE "cookie_consent_action_enum" AS ENUM (
    'accept_all',
    'reject_all',
    'save_settings'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "cookie_consent_surface_enum" AS ENUM (
    'banner',
    'settings'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cookie_consent_event" (
  "id" text PRIMARY KEY NOT NULL,
  "source" text DEFAULT 'nailmoment.pl' NOT NULL,
  "action" "cookie_consent_action_enum" NOT NULL,
  "surface" "cookie_consent_surface_enum" NOT NULL,
  "marketing" boolean NOT NULL,
  "necessary" boolean DEFAULT true NOT NULL,
  "consent_version" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cookie_consent_event_created_at_idx"
  ON "cookie_consent_event" ("created_at");
