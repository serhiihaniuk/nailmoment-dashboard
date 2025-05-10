import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
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

export const battleTicketTable = pgTable("battle_ticket", {
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
});

export const ticketTable = pgTable("ticket", {
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
});

export const paymentInstallmentTable = pgTable("payment_installment", {
  id: text("id").primaryKey(),
  ticket_id: text("ticket_id")
    .notNull()
    .references(() => ticketTable.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  due_date: timestamp("due_date", { withTimezone: true, mode: "date" }),
  is_paid: boolean("is_paid").notNull().default(false),
  paid_date: timestamp("paid_date", { withTimezone: true, mode: "date" }),
  invoice_requested: boolean("invoice_requested").notNull().default(false),
  invoice_sent: boolean("invoice_sent").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ticketTableRelations = relations(ticketTable, ({ many }) => ({
  paymentInstallments: many(paymentInstallmentTable),
}));

export const paymentInstallmentTableRelations = relations(
  paymentInstallmentTable,
  ({ one }) => ({
    ticket: one(ticketTable, {
      fields: [paymentInstallmentTable.ticket_id],
      references: [ticketTable.id],
    }),
  })
);

export type BattleTicket = typeof battleTicketTable.$inferSelect;
export type InsertBattleTicket = typeof battleTicketTable.$inferInsert;

export type Ticket = typeof ticketTable.$inferSelect;
export type InsertTicket = typeof ticketTable.$inferInsert;
