CREATE TYPE "public"."stripe_webhook_event_status_enum" AS ENUM('processing', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TABLE "stripe_webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"stripe_session_id" text,
	"status" "stripe_webhook_event_status_enum" DEFAULT 'processing' NOT NULL,
	"status_reason" text,
	"last_error" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
