import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  bigint,
  index,
  unique,
  uniqueIndex,
  decimal,
} from "drizzle-orm/pg-core";

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

export const saleSourceEnum = pgEnum("sale_source_enum", [
  "site",
  "direct_transfer",
  "other",
]);

export const paymentPlanEnum = pgEnum("payment_plan_enum", [
  "full",
  "two_parts",
  "three_parts",
  "custom",
  "free",
  "sponsor",
]);

export const paymentMethodEnum = pgEnum("payment_method_enum", [
  "nail_moment_company",
  "revolut",
  "blik",
  "cash",
  "bank_transfer",
  "other",
]);

export const invoiceStatusEnum = pgEnum("invoice_status_enum", [
  "not_sent",
  "requested",
  "sent",
  "not_needed",
]);

// Lifecycle for a Stripe event delivery in the webhook audit/idempotency table.
// `processing` means a worker claimed the event, `processed` means fulfillment
// completed, `ignored` means the app intentionally skipped it, and `failed`
// means Stripe can retry and the handler may reclaim it.
export const stripeWebhookEventStatusEnum = pgEnum(
  "stripe_webhook_event_status_enum",
  ["processing", "processed", "ignored", "failed"]
);

export const cookieConsentActionEnum = pgEnum("cookie_consent_action_enum", [
  "accept_all",
  "reject_all",
  "save_settings",
]);

export const cookieConsentSurfaceEnum = pgEnum("cookie_consent_surface_enum", [
  "banner",
  "settings",
]);

export const audienceVoteKindEnum = pgEnum("audience_vote_kind_enum", [
  "speaker",
  "battle",
  "final_battle",
]);

export const audienceVoteStatusEnum = pgEnum("audience_vote_status_enum", [
  "draft",
  "scheduled",
  "open",
  "closed",
]);

export const voteCandidateMediaTypeEnum = pgEnum(
  "vote_candidate_media_type_enum",
  ["photo", "video"]
);

export const audienceVoteBroadcastStatusEnum = pgEnum(
  "audience_vote_broadcast_status_enum",
  [
    "canary_operator_pending",
    "canary_operator_sent",
    "canary_voters_sent",
    "ready",
    "completed",
    "interrupted",
    "failed",
  ]
);

export const audienceVoteBroadcastDeliveryStageEnum = pgEnum(
  "audience_vote_broadcast_delivery_stage_enum",
  ["operator_canary", "voter_canary", "normal"]
);

export const audienceVoteBroadcastDeliveryStatusEnum = pgEnum(
  "audience_vote_broadcast_delivery_status_enum",
  ["pending", "sent", "failed", "skipped"]
);

export const battleTicketTable = pgTable(
  "battle_ticket",
  {
    id: text("id").primaryKey(),
    // Stores the Stripe Checkout Session id for Stripe purchases. Manual admin
    // creations use a `manual_battle_*` value so dashboard filters can still
    // distinguish manual records from Stripe-origin records.
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
    // Webhook retries must not create two local battle tickets for the same
    // Stripe checkout.
    battleTicketStripeEventIdUnique: unique(
      "battle_ticket_stripe_event_id_unique"
    ).on(table.stripe_event_id),
  })
);

export const ticketTable = pgTable(
  "ticket",
  {
    id: text("id").primaryKey(),
    // Stores the Stripe Checkout Session id for site purchases. Manual admin
    // creations use a `manual_*` value; finance UI uses this distinction to lock
    // Stripe-origin payments from manual editing.
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
    // Last line of defense for idempotency: even if a webhook is retried after a
    // partial crash, one Stripe checkout can only map to one local ticket.
    ticketStripeEventIdUnique: unique("ticket_stripe_event_id_unique").on(
      table.stripe_event_id
    ),
  })
);

export const ticketFinanceTable = pgTable(
  "ticket_finance",
  {
    id: text("id").primaryKey(),
    ticket_id: text("ticket_id")
      .notNull()
      .references(() => ticketTable.id, { onDelete: "cascade" }),
    sale_source: saleSourceEnum("sale_source").notNull().default("site"),
    payment_plan: paymentPlanEnum("payment_plan").notNull().default("full"),
    // For Stripe site checkouts this is the final amount collected by Stripe
    // (`Checkout.Session.amount_total`, converted from cents to "0.00").
    gross_total: decimal("gross_total", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    discount_amount: decimal("discount_amount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    // For Stripe site checkouts this stores the app's estimated Stripe fee.
    tax_amount: decimal("tax_amount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    net_total: decimal("net_total", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    nip: text("nip").notNull().default(""),
    finance_note: text("finance_note").notNull().default(""),
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
  },
  (table) => ({
    ticketFinanceTicketIdUnique: unique("ticket_finance_ticket_id_unique").on(
      table.ticket_id
    ),
  })
);

export const paymentInstallmentTable = pgTable("payment_installment", {
  id: text("id").primaryKey(),
  ticket_id: text("ticket_id")
    .notNull()
    .references(() => ticketTable.id, { onDelete: "cascade" }),
  installment_number: integer("installment_number").notNull().default(1),
  // For Stripe site checkouts this matches `ticket_finance.gross_total`, so the
  // finance summary sees the ticket as fully paid immediately.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  sale_source: saleSourceEnum("sale_source").notNull().default("direct_transfer"),
  due_date: timestamp("due_date", { withTimezone: true, mode: "date" }),
  paid_date: timestamp("paid_date", { withTimezone: true, mode: "date" }),
  is_paid: boolean("is_paid").notNull().default(false),
  payment_method: paymentMethodEnum("payment_method").notNull().default("other"),
  invoice_status: invoiceStatusEnum("invoice_status")
    .notNull()
    .default("not_sent"),
  invoice_number: text("invoice_number").notNull().default(""),
  comment: text("comment").notNull().default(""),
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

// Audit and idempotency table for Stripe webhook deliveries. The primary key is
// the Stripe event id, not the Checkout Session id, because Stripe retries the
// same event id when delivery fails. The session id is stored separately for
// operator search and for tying the webhook row back to ticket/battle records.
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

export const cookieConsentEventTable = pgTable(
  "cookie_consent_event",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull().default("nailmoment.pl"),
    action: cookieConsentActionEnum("action").notNull(),
    surface: cookieConsentSurfaceEnum("surface").notNull(),
    marketing: boolean("marketing").notNull(),
    necessary: boolean("necessary").notNull().default(true),
    consent_version: integer("consent_version").notNull(),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    cookieConsentEventCreatedAtIdx: index(
      "cookie_consent_event_created_at_idx"
    ).on(table.created_at),
  })
);

export type CookieConsentEvent =
  typeof cookieConsentEventTable.$inferSelect;
export type InsertCookieConsentEvent =
  typeof cookieConsentEventTable.$inferInsert;

export const audienceVoteTable = pgTable(
  "audience_vote",
  {
    id: text("id").primaryKey(),
    kind: audienceVoteKindEnum("kind").notNull(),
    title: text("title").notNull(),
    status: audienceVoteStatusEnum("status").notNull().default("draft"),
    window_start: timestamp("window_start", {
      withTimezone: true,
      mode: "date",
    }),
    window_end: timestamp("window_end", {
      withTimezone: true,
      mode: "date",
    }),
    archived: boolean("archived").notNull().default(false),
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
  },
  (table) => ({
    audienceVoteOneOpenActiveIdx: uniqueIndex(
      "audience_vote_one_open_active_idx"
    )
      .on(table.status)
      .where(
        sql`${table.status} = 'open' and ${table.archived} = false`
      ),
    audienceVoteStatusIdx: index("audience_vote_status_idx").on(table.status),
    audienceVoteCreatedAtIdx: index("audience_vote_created_at_idx").on(
      table.created_at
    ),
  })
);

export type AudienceVote = typeof audienceVoteTable.$inferSelect;
export type InsertAudienceVote = typeof audienceVoteTable.$inferInsert;

export const audienceVoteUpdateScreenTable = pgTable(
  "audience_vote_update_screen",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
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
  }
);

export type AudienceVoteUpdateScreen =
  typeof audienceVoteUpdateScreenTable.$inferSelect;
export type InsertAudienceVoteUpdateScreen =
  typeof audienceVoteUpdateScreenTable.$inferInsert;

export const audienceVoteBotSettingsTable = pgTable(
  "audience_vote_bot_settings",
  {
    id: text("id").primaryKey(),
    start_message: text("start_message").notNull(),
    start_button_text: text("start_button_text").notNull(),
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
  }
);

export type AudienceVoteBotSettings =
  typeof audienceVoteBotSettingsTable.$inferSelect;
export type InsertAudienceVoteBotSettings =
  typeof audienceVoteBotSettingsTable.$inferInsert;

export const voteCandidateTable = pgTable(
  "vote_candidate",
  {
    id: text("id").primaryKey(),
    audience_vote_id: text("audience_vote_id")
      .notNull()
      .references(() => audienceVoteTable.id, { onDelete: "cascade" }),
    display_order: integer("display_order").notNull().default(1),
    display_name: text("display_name").notNull(),
    internal_name: text("internal_name"),
    caption: text("caption"),
    archived: boolean("archived").notNull().default(false),
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
  },
  (table) => ({
    voteCandidateAudienceVoteIdx: index("vote_candidate_audience_vote_idx").on(
      table.audience_vote_id
    ),
    voteCandidateAudienceVoteOrderIdx: index(
      "vote_candidate_audience_vote_order_idx"
    ).on(table.audience_vote_id, table.display_order),
  })
);

export type VoteCandidate = typeof voteCandidateTable.$inferSelect;
export type InsertVoteCandidate = typeof voteCandidateTable.$inferInsert;

export const voteCandidateMediaTable = pgTable(
  "vote_candidate_media",
  {
    id: text("id").primaryKey(),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => voteCandidateTable.id, { onDelete: "cascade" }),
    display_order: integer("display_order").notNull().default(1),
    media_type: voteCandidateMediaTypeEnum("media_type").notNull(),
    content_type: text("content_type").notNull(),
    file_name: text("file_name").notNull(),
    file_size_bytes: integer("file_size_bytes").notNull(),
    blob_url: text("blob_url").notNull(),
    blob_download_url: text("blob_download_url").notNull(),
    blob_pathname: text("blob_pathname").notNull(),
    archived: boolean("archived").notNull().default(false),
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
  },
  (table) => ({
    voteCandidateMediaCandidateIdx: index(
      "vote_candidate_media_candidate_idx"
    ).on(table.candidate_id),
    voteCandidateMediaCandidateOrderIdx: index(
      "vote_candidate_media_candidate_order_idx"
    ).on(table.candidate_id, table.display_order),
    voteCandidateMediaBlobPathnameUnique: unique(
      "vote_candidate_media_blob_pathname_unique"
    ).on(table.blob_pathname),
  })
);

export type VoteCandidateMedia =
  typeof voteCandidateMediaTable.$inferSelect;
export type InsertVoteCandidateMedia =
  typeof voteCandidateMediaTable.$inferInsert;

export type BattleTicket = typeof battleTicketTable.$inferSelect;
export type InsertBattleTicket = typeof battleTicketTable.$inferInsert;

export type Ticket = typeof ticketTable.$inferSelect;
export type InsertTicket = typeof ticketTable.$inferInsert;

export type TicketFinance = typeof ticketFinanceTable.$inferSelect;
export type InsertTicketFinance = typeof ticketFinanceTable.$inferInsert;

export type PaymentInstallment = typeof paymentInstallmentTable.$inferSelect;
export type InsertPaymentInstallment =
  typeof paymentInstallmentTable.$inferInsert;

export type FinancePaymentStatus =
  | "untracked"
  | "unpaid"
  | "partial"
  | "paid"
  | "overdue";

export interface TicketFinanceSummary {
  gross_total: string;
  paid_total: string;
  remaining_total: string;
  payment_count: number;
  payment_status: FinancePaymentStatus;
  invoice_status: (typeof invoiceStatusEnum.enumValues)[number] | null;
  next_due_date: Date | null;
}

export type TicketWithFinance = Ticket & {
  finance: TicketFinance | null;
  payments: PaymentInstallment[];
  finance_summary: TicketFinanceSummary;
};

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

export const audienceVoteBroadcastTable = pgTable(
  "audience_vote_broadcast",
  {
    id: text("id").primaryKey(),
    audience_vote_id: text("audience_vote_id")
      .notNull()
      .references(() => audienceVoteTable.id, { onDelete: "cascade" }),
    message_text: text("message_text").notNull(),
    include_open_button: boolean("include_open_button")
      .notNull()
      .default(false),
    status: audienceVoteBroadcastStatusEnum("status")
      .notNull()
      .default("canary_operator_pending"),
    estimated_recipient_count: integer("estimated_recipient_count")
      .notNull()
      .default(0),
    canary_voter_limit: integer("canary_voter_limit").notNull().default(25),
    operator_telegram_user_id: bigint("operator_telegram_user_id", {
      mode: "number",
    }).notNull(),
    next_stage_at: timestamp("next_stage_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    interrupted_at: timestamp("interrupted_at", {
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
  },
  (table) => ({
    audienceVoteBroadcastVoteIdx: index(
      "audience_vote_broadcast_vote_idx"
    ).on(table.audience_vote_id),
    audienceVoteBroadcastStatusIdx: index(
      "audience_vote_broadcast_status_idx"
    ).on(table.status),
    audienceVoteBroadcastCreatedAtIdx: index(
      "audience_vote_broadcast_created_at_idx"
    ).on(table.created_at),
  })
);

export const audienceVoteBroadcastDeliveryTable = pgTable(
  "audience_vote_broadcast_delivery",
  {
    id: text("id").primaryKey(),
    broadcast_id: text("broadcast_id")
      .notNull()
      .references(() => audienceVoteBroadcastTable.id, { onDelete: "cascade" }),
    telegram_user_id: bigint("telegram_user_id", {
      mode: "number",
    }).notNull(),
    stage: audienceVoteBroadcastDeliveryStageEnum("stage").notNull(),
    status: audienceVoteBroadcastDeliveryStatusEnum("status")
      .notNull()
      .default("pending"),
    attempt_count: integer("attempt_count").notNull().default(0),
    last_error: text("last_error"),
    sent_at: timestamp("sent_at", {
      withTimezone: true,
      mode: "date",
    }),
    next_attempt_at: timestamp("next_attempt_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
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
  },
  (table) => ({
    audienceVoteBroadcastDeliveryBroadcastIdx: index(
      "audience_vote_broadcast_delivery_broadcast_idx"
    ).on(table.broadcast_id),
    audienceVoteBroadcastDeliveryStatusIdx: index(
      "audience_vote_broadcast_delivery_status_idx"
    ).on(table.status),
    audienceVoteBroadcastDeliveryBroadcastStageStatusIdx: index(
      "audience_vote_broadcast_delivery_broadcast_stage_status_idx"
    ).on(table.broadcast_id, table.stage, table.status),
    audienceVoteBroadcastDeliveryDueIdx: index(
      "audience_vote_broadcast_delivery_due_idx"
    ).on(table.stage, table.status, table.next_attempt_at),
    audienceVoteBroadcastDeliveryUnique: unique(
      "audience_vote_broadcast_delivery_unique"
    ).on(table.broadcast_id, table.telegram_user_id, table.stage),
  })
);

export const audienceVoteCurrentVoteTable = pgTable(
  "audience_vote_current_vote",
  {
    id: text("id").primaryKey(),
    audience_vote_id: text("audience_vote_id")
      .notNull()
      .references(() => audienceVoteTable.id, { onDelete: "cascade" }),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => voteCandidateTable.id, { onDelete: "cascade" }),
    telegram_user_id: bigint("telegram_user_id", { mode: "number" })
      .notNull()
      .references(() => telegramUsersTable.telegramUserId),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    audienceVoteCurrentVoteVoteVoterUnique: unique(
      "audience_vote_current_vote_vote_voter_unique"
    ).on(table.audience_vote_id, table.telegram_user_id),
    audienceVoteCurrentVoteAudienceVoteIdx: index(
      "audience_vote_current_vote_audience_vote_idx"
    ).on(table.audience_vote_id),
    audienceVoteCurrentVoteCandidateIdx: index(
      "audience_vote_current_vote_candidate_idx"
    ).on(table.candidate_id),
  })
);

export type TelegramUser = typeof telegramUsersTable.$inferSelect;
export type InsertTelegramUser = typeof telegramUsersTable.$inferInsert;

export type AudienceVoteBroadcast =
  typeof audienceVoteBroadcastTable.$inferSelect;
export type InsertAudienceVoteBroadcast =
  typeof audienceVoteBroadcastTable.$inferInsert;

export type AudienceVoteBroadcastDelivery =
  typeof audienceVoteBroadcastDeliveryTable.$inferSelect;
export type InsertAudienceVoteBroadcastDelivery =
  typeof audienceVoteBroadcastDeliveryTable.$inferInsert;

export type AudienceVoteCurrentVote =
  typeof audienceVoteCurrentVoteTable.$inferSelect;
export type InsertAudienceVoteCurrentVote =
  typeof audienceVoteCurrentVoteTable.$inferInsert;
