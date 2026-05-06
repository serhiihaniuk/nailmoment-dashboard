ALTER TABLE "payment_installment" ADD COLUMN IF NOT EXISTS "is_paid" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "payment_installment" SET "is_paid" = true WHERE "paid_date" IS NOT NULL;
