-- Probe/data migration: seed the "Народний спікер" Audience Vote.
--
-- This file is intentionally outside the numbered Drizzle migration sequence.
-- Do not run it through a blind "apply all migrations" flow.
--
-- What it does:
-- - keeps telegram_users untouched;
-- - deletes Audience Vote operational state by deleting audience_vote rows
--   (cascades candidates, media rows, current votes, broadcasts, deliveries);
-- - upserts the /start bot message and waiting screen;
-- - creates one draft speaker vote with 13 candidates and 13 uploaded videos.
--
-- Before running against any environment:
-- 1. Upload the optimized videos to that environment's Vercel Blob store.
-- 2. Replace every __BLOB_*__ placeholder below with the uploaded Blob values.
-- 3. Review the DELETE statement. This resets Audience Vote state only.

BEGIN;

CREATE TEMP TABLE _audience_vote_seed_media (
  display_order integer PRIMARY KEY,
  candidate_id text NOT NULL,
  media_id text NOT NULL,
  display_name text NOT NULL,
  internal_name text NOT NULL,
  source_file_name text NOT NULL,
  optimized_file_name text NOT NULL,
  file_size_bytes integer NOT NULL,
  blob_url text NOT NULL,
  blob_download_url text NOT NULL,
  blob_pathname text NOT NULL
) ON COMMIT DROP;

INSERT INTO _audience_vote_seed_media (
  display_order,
  candidate_id,
  media_id,
  display_name,
  internal_name,
  source_file_name,
  optimized_file_name,
  file_size_bytes,
  blob_url,
  blob_download_url,
  blob_pathname
) VALUES
  (
    1,
    'vc_narodnyi_spiker_iryna',
    'vcm_narodnyi_spiker_iryna',
    'Iryna',
    'Iryna · IMG_0025.MP4',
    'IMG_0025.MP4',
    'IMG_0025.optimized.mp4',
    16542384,
    '__BLOB_URL_IMG_0025__',
    '__BLOB_DOWNLOAD_URL_IMG_0025__',
    '__BLOB_PATHNAME_IMG_0025__'
  ),
  (
    2,
    'vc_narodnyi_spiker_inesa_kruhliak',
    'vcm_narodnyi_spiker_inesa_kruhliak',
    'Inesa Kruhliak',
    'Inesa Kruhliak · IMG_1455.MOV',
    'IMG_1455.MOV',
    'IMG_1455.optimized.mp4',
    7108108,
    '__BLOB_URL_IMG_1455__',
    '__BLOB_DOWNLOAD_URL_IMG_1455__',
    '__BLOB_PATHNAME_IMG_1455__'
  ),
  (
    3,
    'vc_narodnyi_spiker_zoreslava',
    'vcm_narodnyi_spiker_zoreslava',
    'Zoreslava',
    'Zoreslava · IMG_3155.MOV',
    'IMG_3155.MOV',
    'IMG_3155.optimized.mp4',
    9868446,
    '__BLOB_URL_IMG_3155__',
    '__BLOB_DOWNLOAD_URL_IMG_3155__',
    '__BLOB_PATHNAME_IMG_3155__'
  ),
  (
    4,
    'vc_narodnyi_spiker_oksana',
    'vcm_narodnyi_spiker_oksana',
    'Oksana',
    'Oksana · IMG_3453.MP4',
    'IMG_3453.MP4',
    'IMG_3453.optimized.mp4',
    8801283,
    '__BLOB_URL_IMG_3453__',
    '__BLOB_DOWNLOAD_URL_IMG_3453__',
    '__BLOB_PATHNAME_IMG_3453__'
  ),
  (
    5,
    'vc_narodnyi_spiker_zoe_doza',
    'vcm_narodnyi_spiker_zoe_doza',
    'Zoe Doza',
    'Zoe Doza · IMG_4055.MOV',
    'IMG_4055.MOV',
    'IMG_4055.optimized.mp4',
    13078551,
    '__BLOB_URL_IMG_4055__',
    '__BLOB_DOWNLOAD_URL_IMG_4055__',
    '__BLOB_PATHNAME_IMG_4055__'
  ),
  (
    6,
    'vc_narodnyi_spiker_tetiana_salinska',
    'vcm_narodnyi_spiker_tetiana_salinska',
    'Tetiana Salinska',
    'Tetiana Salinska · IMG_6288.MOV',
    'IMG_6288.MOV',
    'IMG_6288.optimized.mp4',
    9505607,
    '__BLOB_URL_IMG_6288__',
    '__BLOB_DOWNLOAD_URL_IMG_6288__',
    '__BLOB_PATHNAME_IMG_6288__'
  ),
  (
    7,
    'vc_narodnyi_spiker_tatiana_rud',
    'vcm_narodnyi_spiker_tatiana_rud',
    'Татьяна Рудь',
    'Татьяна Рудь · IMG_6599.MOV',
    'IMG_6599.MOV',
    'IMG_6599.optimized.mp4',
    8525377,
    '__BLOB_URL_IMG_6599__',
    '__BLOB_DOWNLOAD_URL_IMG_6599__',
    '__BLOB_PATHNAME_IMG_6599__'
  ),
  (
    8,
    'vc_narodnyi_spiker_polina_yusupova',
    'vcm_narodnyi_spiker_polina_yusupova',
    'Полина Юсупова',
    'Полина Юсупова · IMG_7689.MOV',
    'IMG_7689.MOV',
    'IMG_7689.optimized.mp4',
    10810291,
    '__BLOB_URL_IMG_7689__',
    '__BLOB_DOWNLOAD_URL_IMG_7689__',
    '__BLOB_PATHNAME_IMG_7689__'
  ),
  (
    9,
    'vc_narodnyi_spiker_marina_morozivska',
    'vcm_narodnyi_spiker_marina_morozivska',
    'Marina Morozivska',
    'Marina Morozivska · IMG_7872.MOV',
    'IMG_7872.MOV',
    'IMG_7872.optimized.mp4',
    24186031,
    '__BLOB_URL_IMG_7872__',
    '__BLOB_DOWNLOAD_URL_IMG_7872__',
    '__BLOB_PATHNAME_IMG_7872__'
  ),
  (
    10,
    'vc_narodnyi_spiker_masha_blazhko',
    'vcm_narodnyi_spiker_masha_blazhko',
    'Маша Блажко',
    'Маша Блажко · IMG_8067.MP4',
    'IMG_8067.MP4',
    'IMG_8067.optimized.mp4',
    30453963,
    '__BLOB_URL_IMG_8067__',
    '__BLOB_DOWNLOAD_URL_IMG_8067__',
    '__BLOB_PATHNAME_IMG_8067__'
  ),
  (
    11,
    'vc_narodnyi_spiker_anna_soloviova',
    'vcm_narodnyi_spiker_anna_soloviova',
    'Anna Soloviova',
    'Anna Soloviova · IMG_8250.MOV',
    'IMG_8250.MOV',
    'IMG_8250.optimized.mp4',
    7394425,
    '__BLOB_URL_IMG_8250__',
    '__BLOB_DOWNLOAD_URL_IMG_8250__',
    '__BLOB_PATHNAME_IMG_8250__'
  ),
  (
    12,
    'vc_narodnyi_spiker_maryna',
    'vcm_narodnyi_spiker_maryna',
    'Марина',
    'Марина · IMG_9421.MOV',
    'IMG_9421.MOV',
    'IMG_9421.optimized.mp4',
    13148329,
    '__BLOB_URL_IMG_9421__',
    '__BLOB_DOWNLOAD_URL_IMG_9421__',
    '__BLOB_PATHNAME_IMG_9421__'
  ),
  (
    13,
    'vc_narodnyi_spiker_tetiana_vyval',
    'vcm_narodnyi_spiker_tetiana_vyval',
    'Tetiana Vyval',
    'Tetiana Vyval · lv_0_20260501155041.mp4',
    'lv_0_20260501155041.mp4',
    'lv_0_20260501155041.optimized.mp4',
    12187634,
    '__BLOB_URL_LV_0_20260501155041__',
    '__BLOB_DOWNLOAD_URL_LV_0_20260501155041__',
    '__BLOB_PATHNAME_LV_0_20260501155041__'
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM _audience_vote_seed_media
    WHERE strpos(blob_url, '__BLOB_') > 0
       OR strpos(blob_download_url, '__BLOB_') > 0
       OR strpos(blob_pathname, '__BLOB_') > 0
  ) THEN
    RAISE EXCEPTION 'Replace all Blob placeholders before running this probe/data migration.';
  END IF;
END $$;

DELETE FROM audience_vote;

INSERT INTO audience_vote_bot_settings (
  id,
  start_message,
  start_button_text,
  created_at,
  updated_at
) VALUES (
  'default',
  $message$Привіт! Я — бот Nail Moment, і я допоможу визначити переможця конкурсу «Народний спікер», який проходить у рамках підготовки до нашого фестивалю у Варшаві 💛💅

🎤 Переможець конкурсу виступить на головній сцені Nail Moment 7 червня 2026 року з авторською темою, яка переможе у голосуванні.

Голосування триває 24 години. Ти можешь віддати тільки ОДИН голос за одного із кандидатів. 
Переможця дізнаєшся вже 13 травня у Інстаграмі 🌱$message$,
  'Відкрити голосування',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  start_message = EXCLUDED.start_message,
  start_button_text = EXCLUDED.start_button_text,
  updated_at = now();

INSERT INTO audience_vote_update_screen (
  id,
  title,
  message,
  created_at,
  updated_at
) VALUES (
  'default',
  'Голосування скоро',
  'Наразі немає відкритого голосування. Ми покажемо нове голосування тут, щойно воно стартує.',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  message = EXCLUDED.message,
  updated_at = now();

INSERT INTO audience_vote (
  id,
  kind,
  title,
  status,
  window_start,
  window_end,
  archived,
  created_at,
  updated_at
) VALUES (
  'av_narodnyi_spiker_2026',
  'speaker',
  'Народний спікер',
  'draft',
  NULL,
  NULL,
  false,
  now(),
  now()
);

INSERT INTO vote_candidate (
  id,
  audience_vote_id,
  display_order,
  display_name,
  internal_name,
  caption,
  archived,
  created_at,
  updated_at
)
SELECT
  candidate_id,
  'av_narodnyi_spiker_2026',
  display_order,
  display_name,
  internal_name,
  NULL,
  false,
  now(),
  now()
FROM _audience_vote_seed_media
ORDER BY display_order;

INSERT INTO vote_candidate_media (
  id,
  candidate_id,
  display_order,
  media_type,
  content_type,
  file_name,
  file_size_bytes,
  blob_url,
  blob_download_url,
  blob_pathname,
  archived,
  created_at,
  updated_at
)
SELECT
  media_id,
  candidate_id,
  1,
  'video',
  'video/mp4',
  optimized_file_name,
  file_size_bytes,
  blob_url,
  blob_download_url,
  blob_pathname,
  false,
  now(),
  now()
FROM _audience_vote_seed_media
ORDER BY display_order;

COMMIT;
