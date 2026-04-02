import { pgTable, text, timestamp, boolean, integer, pgEnum, bigint, unique } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const paymentTypeEnum = pgEnum("payment_type_enum", [
  "full",
  "2_rates",
  "3_rates",
  "free",
  "sponsor",
]);

export const stripeWebhookEventStatusEnum = pgEnum(
  "stripe_webhook_event_status_enum",
  ["processing", "processed", "ignored", "failed"]
);

export const battleTicketTable = pgTable(
  "battle_ticket",
  {
    id: text("id").primaryKey(),
    stripe_event_id: text("stripe_event_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    instagram: text("instagram").notNull(),
    phone: text("phone").notNull(),
    nomination_quantity: integer("nomination_quantity").notNull().default(0),
    date: timestamp("date", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    archived: boolean("archived").notNull().default(false),
    mail_sent: boolean("mail_sent").notNull().default(false),
    photos_sent: boolean("photos_sent").notNull().default(false),
    comment: text("comment").notNull().default(""),
    payment_type: paymentTypeEnum("payment_type").notNull().default("full"),
  },
  (table) => ({
    battleTicketStripeEventIdUnique: unique(
      "battle_ticket_stripe_event_id_unique"
    ).on(table.stripe_event_id),
  })
);

export const ticketTable = pgTable(
  "ticket",
  {
    id: text("id").primaryKey(),
    stripe_event_id: text("stripe_event_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    instagram: text("instagram").notNull(),
    phone: text("phone").notNull(),
    qr_code: text("qr_code").notNull(),
    arrived: boolean("arrived").notNull().default(false),
    grade: text("grade").notNull().default("unknown"),
    updated_grade: text("updated_grade"),
    date: timestamp("date", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    archived: boolean("archived").notNull().default(false),
    mail_sent: boolean("mail_sent").notNull().default(false),
    comment: text("comment").notNull().default(""),
  },
  (table) => ({
    ticketStripeEventIdUnique: unique("ticket_stripe_event_id_unique").on(
      table.stripe_event_id
    ),
  })
);

export const stripeWebhookEventTable = pgTable("stripe_webhook_event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  stripe_session_id: text("stripe_session_id"),
  status: stripeWebhookEventStatusEnum("status").notNull().default("processing"),
  status_reason: text("status_reason"),
  last_error: text("last_error"),
  attempt_count: integer("attempt_count").notNull().default(1),
  processed_at: timestamp("processed_at", {
    withTimezone: true,
    mode: "date",
  }),
  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type StripeWebhookEvent = typeof stripeWebhookEventTable.$inferSelect;

export type BattleTicket = typeof battleTicketTable.$inferSelect;
export type InsertBattleTicket = typeof battleTicketTable.$inferInsert;

export type Ticket = typeof ticketTable.$inferSelect;
export type InsertTicket = typeof ticketTable.$inferInsert;

export const speakerVoteTGTable = pgTable("speaker_vote_tg", {
  id: text("id").primaryKey(),

  telegram_user_id: bigint("telegram_user_id", { mode: "number" })
    .notNull()
    .unique(),

  voted_for_id: text("voted_for_id").notNull(),

  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SpeakerVoteTG = typeof speakerVoteTGTable.$inferSelect;
export type InsertSpeakerVoteTG = typeof speakerVoteTGTable.$inferInsert;

export const telegramUsersTable = pgTable("telegram_users", {
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).primaryKey(),
  firstName: text("first_name").notNull(),
  username: text("username"),
  isActive: boolean("is_active").notNull().default(true),

  lastBroadcastSentAt: timestamp("last_broadcast_sent_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Stores the votes for the "Battle of Masters" event.
 * Keeps this data separate from the previous "Speaker Vote" event.
 */
export const battleVoteTGTable = pgTable(
  "battle_vote_tg",
  {
    id: text("id").primaryKey(),

    telegram_user_id: bigint("telegram_user_id", { mode: "number" })
      .notNull()
      .references(() => telegramUsersTable.telegramUserId),

    voted_for_contestant_id: text("voted_for_contestant_id").notNull(),

    category_id: text("category_id").notNull(),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => {
    return {
      userCategoryUnique: unique("user_category_unique").on(
        table.telegram_user_id,
        table.category_id
      ),
    };
  }
);

export type TelegramUser = typeof telegramUsersTable.$inferSelect;
export type InsertTelegramUser = typeof telegramUsersTable.$inferInsert;

export type BattleVoteTG = typeof battleVoteTGTable.$inferSelect;
export type InsertBattleVoteTG = typeof battleVoteTGTable.$inferInsert;
