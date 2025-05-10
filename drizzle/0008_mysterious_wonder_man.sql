CREATE TYPE "public"."payment_type_enum" AS ENUM('full', '2_rates', '3_rates', 'free', 'sponsor');--> statement-breakpoint
CREATE TABLE "payment_installment" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp with time zone,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_date" timestamp with time zone,
	"invoice_requested" boolean DEFAULT false NOT NULL,
	"invoice_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battle_ticket" ADD COLUMN "payment_type" "payment_type_enum" DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_installment" ADD CONSTRAINT "payment_installment_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;