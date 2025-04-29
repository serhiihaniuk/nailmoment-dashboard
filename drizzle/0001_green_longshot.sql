CREATE TABLE "ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"instagram" text NOT NULL,
	"phone" text NOT NULL,
	"qr_code" text NOT NULL,
	"arrived" boolean DEFAULT false NOT NULL,
	"grade" text DEFAULT 'unknown' NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
