-- Schema-only probe for the Audience Vote production rollout.
--
-- This is not a data migration and it intentionally does not create, delete,
-- or seed any votes, candidates, media, broadcasts, or Telegram users.
--
-- Use this after applying the canonical schema migrations:
-- - drizzle/0022_audience_vote_core.sql
-- - drizzle/0023_vote_candidates.sql
-- - drizzle/0024_vote_candidate_media.sql
-- - drizzle/0025_audience_vote_one_open.sql
-- - drizzle/0026_audience_vote_current_votes.sql
-- - drizzle/0027_audience_vote_broadcast_canary.sql
-- - drizzle/0028_audience_vote_broadcast_retry_processor.sql
-- - drizzle/0029_audience_vote_update_screen.sql
-- - drizzle/0031_audience_vote_bot_settings.sql
--
-- Keep drizzle/0030_drop_legacy_telegram_votes.sql as a separate explicit
-- cleanup approval because it drops the old Telegram voting tables.

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regtype('public.audience_vote_kind_enum') IS NULL THEN
    missing := array_append(missing, 'type audience_vote_kind_enum');
  END IF;

  IF to_regtype('public.audience_vote_status_enum') IS NULL THEN
    missing := array_append(missing, 'type audience_vote_status_enum');
  END IF;

  IF to_regtype('public.vote_candidate_media_type_enum') IS NULL THEN
    missing := array_append(missing, 'type vote_candidate_media_type_enum');
  END IF;

  IF to_regtype('public.audience_vote_broadcast_status_enum') IS NULL THEN
    missing := array_append(missing, 'type audience_vote_broadcast_status_enum');
  END IF;

  IF to_regtype('public.audience_vote_broadcast_delivery_stage_enum') IS NULL THEN
    missing := array_append(missing, 'type audience_vote_broadcast_delivery_stage_enum');
  END IF;

  IF to_regtype('public.audience_vote_broadcast_delivery_status_enum') IS NULL THEN
    missing := array_append(missing, 'type audience_vote_broadcast_delivery_status_enum');
  END IF;

  IF to_regclass('public.audience_vote') IS NULL THEN
    missing := array_append(missing, 'table audience_vote');
  END IF;

  IF to_regclass('public.vote_candidate') IS NULL THEN
    missing := array_append(missing, 'table vote_candidate');
  END IF;

  IF to_regclass('public.vote_candidate_media') IS NULL THEN
    missing := array_append(missing, 'table vote_candidate_media');
  END IF;

  IF to_regclass('public.audience_vote_current_vote') IS NULL THEN
    missing := array_append(missing, 'table audience_vote_current_vote');
  END IF;

  IF to_regclass('public.audience_vote_broadcast') IS NULL THEN
    missing := array_append(missing, 'table audience_vote_broadcast');
  END IF;

  IF to_regclass('public.audience_vote_broadcast_delivery') IS NULL THEN
    missing := array_append(missing, 'table audience_vote_broadcast_delivery');
  END IF;

  IF to_regclass('public.audience_vote_update_screen') IS NULL THEN
    missing := array_append(missing, 'table audience_vote_update_screen');
  END IF;

  IF to_regclass('public.audience_vote_bot_settings') IS NULL THEN
    missing := array_append(missing, 'table audience_vote_bot_settings');
  END IF;

  IF to_regclass('public.audience_vote_one_open_active_idx') IS NULL THEN
    missing := array_append(missing, 'index audience_vote_one_open_active_idx');
  END IF;

  IF to_regclass('public.vote_candidate_media_blob_pathname_unique') IS NULL THEN
    missing := array_append(missing, 'constraint/index vote_candidate_media_blob_pathname_unique');
  END IF;

  IF to_regclass('public.audience_vote_current_vote_vote_voter_unique') IS NULL THEN
    missing := array_append(missing, 'constraint/index audience_vote_current_vote_vote_voter_unique');
  END IF;

  IF to_regclass('public.audience_vote_broadcast_delivery_unique') IS NULL THEN
    missing := array_append(missing, 'constraint/index audience_vote_broadcast_delivery_unique');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audience_vote_bot_settings'
      AND column_name = 'start_message'
  ) THEN
    missing := array_append(missing, 'column audience_vote_bot_settings.start_message');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audience_vote_bot_settings'
      AND column_name = 'start_button_text'
  ) THEN
    missing := array_append(missing, 'column audience_vote_bot_settings.start_button_text');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audience_vote_update_screen'
      AND column_name = 'message'
  ) THEN
    missing := array_append(missing, 'column audience_vote_update_screen.message');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vote_candidate_media'
      AND column_name = 'blob_pathname'
  ) THEN
    missing := array_append(missing, 'column vote_candidate_media.blob_pathname');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audience_vote_broadcast'
      AND column_name = 'next_stage_at'
  ) THEN
    missing := array_append(missing, 'column audience_vote_broadcast.next_stage_at');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audience_vote_broadcast_delivery'
      AND column_name = 'next_attempt_at'
  ) THEN
    missing := array_append(missing, 'column audience_vote_broadcast_delivery.next_attempt_at');
  END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Audience Vote schema probe failed. Missing: %',
      array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'Audience Vote schema probe passed.';
END $$;
