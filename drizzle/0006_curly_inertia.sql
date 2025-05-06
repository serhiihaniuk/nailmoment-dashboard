CREATE TABLE "battle_ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"instagram" text NOT NULL,
	"phone" text NOT NULL,
	"nomination_quantity" integer DEFAULT 0 NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"mail_sent" boolean DEFAULT false NOT NULL,
	"comment" text DEFAULT '' NOT NULL
);
