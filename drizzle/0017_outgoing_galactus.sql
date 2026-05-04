CREATE TYPE "public"."invoice_status_enum" AS ENUM('not_sent', 'requested', 'sent', 'not_needed');--> statement-breakpoint
CREATE TYPE "public"."payment_method_enum" AS ENUM('nail_moment_company', 'revolut', 'blik', 'cash', 'bank_transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_plan_enum" AS ENUM('full', 'two_parts', 'three_parts', 'custom', 'free', 'sponsor');--> statement-breakpoint
CREATE TYPE "public"."sale_source_enum" AS ENUM('site', 'direct_transfer', 'other');--> statement-breakpoint
CREATE TABLE "payment_installment" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"installment_number" integer DEFAULT 1 NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp with time zone,
	"paid_date" timestamp with time zone,
	"payment_method" "payment_method_enum" DEFAULT 'other' NOT NULL,
	"invoice_status" "invoice_status_enum" DEFAULT 'not_sent' NOT NULL,
	"invoice_number" text DEFAULT '' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_finance" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"sale_source" "sale_source_enum" DEFAULT 'site' NOT NULL,
	"payment_plan" "payment_plan_enum" DEFAULT 'full' NOT NULL,
	"gross_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"nip" text DEFAULT '' NOT NULL,
	"finance_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_finance_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
ALTER TABLE "payment_installment" ADD CONSTRAINT "payment_installment_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_finance" ADD CONSTRAINT "ticket_finance_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;