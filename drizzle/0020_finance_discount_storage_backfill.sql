CREATE TABLE IF NOT EXISTS "finance_discount_storage_migration_20260506" (
  "ticket_finance_id" text PRIMARY KEY,
  "ticket_id" text NOT NULL,
  "old_gross_total" numeric(10, 2) NOT NULL,
  "old_discount_amount" numeric(10, 2) NOT NULL,
  "old_tax_amount" numeric(10, 2) NOT NULL,
  "old_net_total" numeric(10, 2) NOT NULL,
  "old_finance_note" text NOT NULL,
  "new_gross_total" numeric(10, 2) NOT NULL,
  "new_discount_amount" numeric(10, 2) NOT NULL,
  "new_net_total" numeric(10, 2) NOT NULL,
  "migration_kind" text NOT NULL,
  "migrated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
WITH raw_candidates AS (
  SELECT
    "id" AS "ticket_finance_id",
    "ticket_id",
    "gross_total",
    "discount_amount",
    "tax_amount",
    "net_total",
    "finance_note",
    CASE
      WHEN "finance_note" ~* '\d+(?:[,.]\d+)?\s*%' THEN
        replace(
          regexp_replace(
            substring("finance_note" from '\d+(?:[,.]\d+)?\s*%'),
            '[^0-9,.]',
            '',
            'g'
          ),
          ',',
          '.'
        )::numeric
      ELSE NULL
    END AS "percent_value"
  FROM "ticket_finance"
  WHERE "payment_plan" NOT IN ('free', 'sponsor')
    AND (
      "discount_amount"::numeric <> 0
      OR "finance_note" ~* '\d+(?:[,.]\d+)?\s*%'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "finance_discount_storage_migration_20260506" "migration"
      WHERE "migration"."ticket_finance_id" = "ticket_finance"."id"
    )
),
computed AS (
  SELECT
    "ticket_finance_id",
    "ticket_id",
    "gross_total"::numeric AS "old_gross_total",
    "discount_amount"::numeric AS "old_discount_amount",
    "tax_amount"::numeric AS "old_tax_amount",
    "net_total"::numeric AS "old_net_total",
    "finance_note" AS "old_finance_note",
    CASE
      WHEN "percent_value" > 0 AND "percent_value" < 100 THEN
        round("gross_total"::numeric / (1 - ("percent_value" / 100)), 2)
      ELSE
        round("gross_total"::numeric + abs("discount_amount"::numeric), 2)
    END AS "new_gross_total",
    CASE
      WHEN "percent_value" > 0 AND "percent_value" < 100 THEN
        round(
          ("gross_total"::numeric / (1 - ("percent_value" / 100))) -
            "gross_total"::numeric,
          2
        )
      ELSE
        round(abs("discount_amount"::numeric), 2)
    END AS "new_discount_amount",
    greatest(round("gross_total"::numeric - "tax_amount"::numeric, 2), 0) AS "new_net_total",
    CASE
      WHEN "percent_value" > 0 AND "percent_value" < 100 THEN 'percent-note'
      ELSE 'amount'
    END AS "migration_kind"
  FROM "raw_candidates"
  WHERE ("percent_value" > 0 AND "percent_value" < 100)
    OR "discount_amount"::numeric <> 0
)
INSERT INTO "finance_discount_storage_migration_20260506" (
  "ticket_finance_id",
  "ticket_id",
  "old_gross_total",
  "old_discount_amount",
  "old_tax_amount",
  "old_net_total",
  "old_finance_note",
  "new_gross_total",
  "new_discount_amount",
  "new_net_total",
  "migration_kind"
)
SELECT
  "ticket_finance_id",
  "ticket_id",
  "old_gross_total",
  "old_discount_amount",
  "old_tax_amount",
  "old_net_total",
  "old_finance_note",
  "new_gross_total",
  "new_discount_amount",
  "new_net_total",
  "migration_kind"
FROM "computed"
ON CONFLICT ("ticket_finance_id") DO NOTHING;
--> statement-breakpoint
UPDATE "ticket_finance" "finance"
SET
  "gross_total" = "migration"."new_gross_total",
  "discount_amount" = "migration"."new_discount_amount",
  "net_total" = "migration"."new_net_total",
  "updated_at" = now()
FROM "finance_discount_storage_migration_20260506" "migration"
WHERE "finance"."id" = "migration"."ticket_finance_id"
  AND "finance"."gross_total" = "migration"."old_gross_total"
  AND "finance"."discount_amount" = "migration"."old_discount_amount"
  AND "finance"."tax_amount" = "migration"."old_tax_amount"
  AND "finance"."net_total" = "migration"."old_net_total";
