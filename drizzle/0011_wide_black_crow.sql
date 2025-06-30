CREATE TABLE "battle_vote_tg" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"voted_for_contestant_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_category_unique" UNIQUE("telegram_user_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_users" (
	"telegram_user_id" bigint PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"username" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battle_vote_tg" ADD CONSTRAINT "battle_vote_tg_telegram_user_id_telegram_users_telegram_user_id_fk" FOREIGN KEY ("telegram_user_id") REFERENCES "public"."telegram_users"("telegram_user_id") ON DELETE no action ON UPDATE no action;