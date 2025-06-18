CREATE TABLE "speaker_vote_tg" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"voted_for_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "speaker_vote_tg_telegram_user_id_unique" UNIQUE("telegram_user_id")
);
