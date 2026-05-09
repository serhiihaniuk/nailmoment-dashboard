DO $$ BEGIN
  CREATE TYPE "vote_candidate_media_type_enum" AS ENUM (
    'photo',
    'video'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vote_candidate_media" (
  "id" text PRIMARY KEY NOT NULL,
  "candidate_id" text NOT NULL,
  "display_order" integer DEFAULT 1 NOT NULL,
  "media_type" "vote_candidate_media_type_enum" NOT NULL,
  "content_type" text NOT NULL,
  "file_name" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "blob_url" text NOT NULL,
  "blob_download_url" text NOT NULL,
  "blob_pathname" text NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vote_candidate_media_candidate_id_vote_candidate_id_fk"
    FOREIGN KEY ("candidate_id")
    REFERENCES "vote_candidate"("id")
    ON DELETE cascade
    ON UPDATE no action,
  CONSTRAINT "vote_candidate_media_blob_pathname_unique"
    UNIQUE("blob_pathname")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vote_candidate_media_candidate_idx"
  ON "vote_candidate_media" ("candidate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vote_candidate_media_candidate_order_idx"
  ON "vote_candidate_media" ("candidate_id", "display_order");
