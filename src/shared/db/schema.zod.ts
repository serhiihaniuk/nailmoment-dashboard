import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
} from "drizzle-zod";
import {
  audienceVoteBroadcastDeliveryStageEnum,
  audienceVoteBroadcastDeliveryStatusEnum,
  audienceVoteBroadcastDeliveryTable,
  audienceVoteBroadcastStatusEnum,
  audienceVoteBroadcastTable,
  audienceVoteKindEnum,
  audienceVoteStatusEnum,
  audienceVoteBotSettingsTable,
  audienceVoteTable,
  audienceVoteUpdateScreenTable,
  battleTicketTable,
  cookieConsentActionEnum,
  cookieConsentEventTable,
  cookieConsentSurfaceEnum,
  paymentInstallmentTable,
  ticketAttributionTable,
  ticketFinanceTable,
  ticketTable,
  voteCandidateMediaTable,
  voteCandidateTable,
} from "./schema";
import { TICKET_TYPE_LIST } from "./ticket-grade";

export const selectTicketSchema = createSelectSchema(ticketTable);
export const selectTicketAttributionSchema =
  createSelectSchema(ticketAttributionTable);

const nullableTrackingValueSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const utmValueSchema = nullableTrackingValueSchema.pipe(
  z.string().max(500).nullable()
);

const trackingUrlSchema = nullableTrackingValueSchema.pipe(
  z.string().max(2048).nullable()
);

export const checkoutAttributionClientSchema = z.object({
  landingPage: trackingUrlSchema,
  referrer: trackingUrlSchema,
  sessionId: z
    .string()
    .trim()
    .min(4)
    .max(255)
    .refine((value) => value.startsWith("cs_"), {
      message: "Invalid Stripe Checkout Session ID",
    }),
  utm: z
    .object({
      utm_campaign: utmValueSchema,
      utm_content: utmValueSchema,
      utm_medium: utmValueSchema,
      utm_source: utmValueSchema,
      utm_term: utmValueSchema,
    })
    .partial()
    .optional()
    .default({}),
});

export const insertTicketSchema = createInsertSchema(ticketTable, {
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string(),
});

export const updateTicketSchema = insertTicketSchema
  .omit({
    id: true,
  })
  .partial();

export const insertTicketClientSchema = z.object({
  name: z.string().trim().min(1, "Ім’я обов’язкове"),
  email: z
    .string()
    .trim()
    .email("Невалідна адреса")
    .min(1, "Email обов’язковий"),
  phone: z.string().min(9, "Телефон обов’язковий"),
  instagram: z.string().optional(),
  grade: z.enum(TICKET_TYPE_LIST).default("standard"),
});

export type SelectTicketInput = z.input<typeof selectTicketSchema>;
export type Ticket = z.output<typeof selectTicketSchema>;
export type CheckoutAttributionClientInput = z.output<
  typeof checkoutAttributionClientSchema
>;

export type InsertTicketInput = z.input<typeof insertTicketSchema>;
export type InsertTicketOutput = z.output<typeof insertTicketSchema>;

export type UpdateTicketInput = z.input<typeof updateTicketSchema>;
export type UpdateTicketOutput = z.output<typeof updateTicketSchema>;

const moneyInputSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 0 : value),
  z.coerce.number().finite().min(0).max(99999999.99)
).transform((value) => value.toFixed(2));

const optionalDateInputSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.date().nullable()
);

function validateAudienceVoteWindow(
  value: { window_end?: Date | null; window_start?: Date | null },
  ctx: z.RefinementCtx
) {
  if (
    value.window_start &&
    value.window_end &&
    value.window_end <= value.window_start
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Завершення має бути після початку",
      path: ["window_end"],
    });
  }
}

export const selectTicketFinanceSchema = createSelectSchema(ticketFinanceTable);

export const upsertTicketFinanceSchema = createInsertSchema(
  ticketFinanceTable,
  {
    gross_total: moneyInputSchema,
    discount_amount: moneyInputSchema,
    tax_amount: moneyInputSchema,
    net_total: moneyInputSchema,
    nip: z.string().trim().optional().default(""),
    finance_note: z.string().trim().optional().default(""),
  }
)
  .omit({
    id: true,
    ticket_id: true,
    created_at: true,
    updated_at: true,
  })
  .partial();

export const selectPaymentInstallmentSchema =
  createSelectSchema(paymentInstallmentTable);

export const insertPaymentInstallmentApiInputSchema = createInsertSchema(
  paymentInstallmentTable,
  {
    installment_number: z.coerce.number().int().min(1).max(12).default(1),
    amount: moneyInputSchema,
    due_date: optionalDateInputSchema,
    paid_date: optionalDateInputSchema,
    is_paid: z.boolean().optional().default(false),
    invoice_number: z.string().trim().optional().default(""),
    comment: z.string().trim().optional().default(""),
  }
)
  .omit({
    id: true,
    ticket_id: true,
    created_at: true,
    updated_at: true,
  })
  .extend({
    amount: moneyInputSchema,
  });

export const patchPaymentInstallmentSchema =
  insertPaymentInstallmentApiInputSchema.partial();

export type UpsertTicketFinanceInput = z.input<
  typeof upsertTicketFinanceSchema
>;
export type InsertPaymentInstallmentInput = z.input<
  typeof insertPaymentInstallmentApiInputSchema
>;
export type PatchPaymentInstallmentInput = z.input<
  typeof patchPaymentInstallmentSchema
>;

export const insertCookieConsentEventSchema = createInsertSchema(
  cookieConsentEventTable,
  {
    consent_version: z.coerce.number().int().min(1).max(100),
  }
);

export const cookieConsentEventClientSchema = z.object({
  action: z.enum(cookieConsentActionEnum.enumValues),
  surface: z.enum(cookieConsentSurfaceEnum.enumValues),
  marketing: z.boolean(),
  consentVersion: z.coerce.number().int().min(1).max(100),
});

export type CookieConsentEventClientInput = z.infer<
  typeof cookieConsentEventClientSchema
>;

const audienceVoteTitleSchema = z
  .string()
  .trim()
  .min(1, "Назва обов’язкова")
  .max(160, "Назва має бути не довшою за 160 символів");
const audienceVoteUpdateScreenTitleSchema = z
  .string()
  .trim()
  .min(1, "Заголовок екрана очікування обов’язковий")
  .max(120, "Заголовок екрана очікування має бути не довшим за 120 символів");
const audienceVoteUpdateScreenMessageSchema = z
  .string()
  .trim()
  .min(1, "Повідомлення екрана очікування обов’язкове")
  .max(1000, "Повідомлення екрана очікування має бути не довшим за 1000 символів");
const audienceVoteBroadcastMessageSchema = z
  .string()
  .trim()
  .min(1, "Текст повідомлення обов’язковий")
  .max(4096, "Текст повідомлення має бути не довшим за 4096 символів");
const audienceVoteOpeningBroadcastClientSchema = z.object({
  include_open_button: z.coerce.boolean().default(true),
  message_text: audienceVoteBroadcastMessageSchema,
});
const audienceVoteBotStartMessageSchema = z
  .string()
  .trim()
  .min(1, "Повідомлення /start обовʼязкове")
  .max(4096, "Повідомлення /start має бути не довшим за 4096 символів");
const audienceVoteBotStartButtonTextSchema = z
  .string()
  .trim()
  .min(1, "Текст кнопки обовʼязковий")
  .max(64, "Текст кнопки має бути не довшим за 64 символи");
const voteCandidateDisplayNameSchema = z
  .string()
  .trim()
  .min(1, "Публічне ім’я обов’язкове")
  .max(160, "Публічне ім’я має бути не довшим за 160 символів");
const voteCandidateDisplayOrderSchema = z.coerce
  .number()
  .int()
  .min(1, "Порядок має бути щонайменше 1")
  .max(1000, "Порядок має бути 1000 або менше");

function normalizeOptionalText(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  return value;
}

function nullableTrimmedTextSchema(max: number, message: string) {
  return z.preprocess(
    normalizeOptionalText,
    z.string().max(max, message).nullable()
  );
}

function defaultNullableTrimmedTextSchema(max: number, message: string) {
  return z
    .preprocess(
      normalizeOptionalText,
      z.string().max(max, message).nullable().optional()
    )
    .transform((value) => value ?? null);
}

function optionalNullableTrimmedTextSchema(max: number, message: string) {
  return z.preprocess(
    normalizeOptionalText,
    z.string().max(max, message).nullable().optional()
  );
}

export const selectAudienceVoteSchema = createSelectSchema(audienceVoteTable);

export const insertAudienceVoteSchema = createInsertSchema(
  audienceVoteTable,
  {
    id: z.string().trim().min(1, "ID обов’язковий"),
    kind: z.enum(audienceVoteKindEnum.enumValues),
    opening_broadcast_include_open_button: z.coerce.boolean().default(true),
    opening_broadcast_message_text: defaultNullableTrimmedTextSchema(
      4096,
      "Текст повідомлення має бути не довшим за 4096 символів"
    ),
    status: z.enum(audienceVoteStatusEnum.enumValues),
    title: audienceVoteTitleSchema,
    window_start: optionalDateInputSchema,
    window_end: optionalDateInputSchema,
  }
).superRefine(validateAudienceVoteWindow);

export const createAudienceVoteClientSchema = z
  .object({
    kind: z.enum(audienceVoteKindEnum.enumValues),
    status: z.enum(["draft", "scheduled"]).default("draft"),
    title: audienceVoteTitleSchema,
    window_start: optionalDateInputSchema,
    window_end: optionalDateInputSchema,
  })
  .superRefine(validateAudienceVoteWindow);

export const patchAudienceVoteScheduleClientSchema = z
  .object({
    status: z.enum(["draft", "scheduled", "open"]),
    window_start: optionalDateInputSchema,
    window_end: optionalDateInputSchema,
    opening_broadcast: audienceVoteOpeningBroadcastClientSchema
      .nullable()
      .optional(),
  })
  .superRefine(validateAudienceVoteWindow);

export type InsertAudienceVoteInput = z.input<
  typeof insertAudienceVoteSchema
>;
export type CreateAudienceVoteClientInput = z.input<
  typeof createAudienceVoteClientSchema
>;
export type CreateAudienceVoteClientOutput = z.output<
  typeof createAudienceVoteClientSchema
>;
export type PatchAudienceVoteScheduleClientInput = z.input<
  typeof patchAudienceVoteScheduleClientSchema
>;
export type PatchAudienceVoteScheduleClientOutput = z.output<
  typeof patchAudienceVoteScheduleClientSchema
>;

export const selectAudienceVoteUpdateScreenSchema = createSelectSchema(
  audienceVoteUpdateScreenTable
);

export const updateAudienceVoteUpdateScreenClientSchema = z.object({
  message: audienceVoteUpdateScreenMessageSchema,
  title: audienceVoteUpdateScreenTitleSchema,
});

export type UpdateAudienceVoteUpdateScreenClientInput = z.input<
  typeof updateAudienceVoteUpdateScreenClientSchema
>;
export type UpdateAudienceVoteUpdateScreenClientOutput = z.output<
  typeof updateAudienceVoteUpdateScreenClientSchema
>;

export const selectAudienceVoteBotSettingsSchema = createSelectSchema(
  audienceVoteBotSettingsTable
);

export const updateAudienceVoteBotSettingsClientSchema = z.object({
  start_button_text: audienceVoteBotStartButtonTextSchema,
  start_message: audienceVoteBotStartMessageSchema,
});

export type UpdateAudienceVoteBotSettingsClientInput = z.input<
  typeof updateAudienceVoteBotSettingsClientSchema
>;
export type UpdateAudienceVoteBotSettingsClientOutput = z.output<
  typeof updateAudienceVoteBotSettingsClientSchema
>;

export const selectAudienceVoteBroadcastSchema = createSelectSchema(
  audienceVoteBroadcastTable
);

export const insertAudienceVoteBroadcastSchema = createInsertSchema(
  audienceVoteBroadcastTable,
  {
    audience_vote_id: z.string().trim().min(1, "ID голосування обов’язковий"),
    canary_voter_limit: z.number().int().min(0).max(25),
    estimated_recipient_count: z.number().int().min(0),
    id: z.string().trim().min(1, "ID обов’язковий"),
    message_text: audienceVoteBroadcastMessageSchema,
    operator_telegram_user_id: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
    status: z.enum(audienceVoteBroadcastStatusEnum.enumValues),
  }
);

export const insertAudienceVoteBroadcastDeliverySchema = createInsertSchema(
  audienceVoteBroadcastDeliveryTable,
  {
    broadcast_id: z.string().trim().min(1, "ID розсилки обов’язковий"),
    id: z.string().trim().min(1, "ID обов’язковий"),
    stage: z.enum(audienceVoteBroadcastDeliveryStageEnum.enumValues),
    status: z.enum(audienceVoteBroadcastDeliveryStatusEnum.enumValues),
    telegram_user_id: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
  }
);

export const createAudienceVoteBroadcastClientSchema = z.object({
  audience_vote_id: z.string().trim().min(1, "Голосування обов’язкове"),
  include_open_button: z.coerce.boolean().default(false),
  message_text: audienceVoteBroadcastMessageSchema,
});

export const previewAudienceVoteBroadcastClientSchema =
  createAudienceVoteBroadcastClientSchema;

export type InsertAudienceVoteBroadcastInput = z.input<
  typeof insertAudienceVoteBroadcastSchema
>;
export type InsertAudienceVoteBroadcastDeliveryInput = z.input<
  typeof insertAudienceVoteBroadcastDeliverySchema
>;
export type CreateAudienceVoteBroadcastClientInput = z.input<
  typeof createAudienceVoteBroadcastClientSchema
>;
export type CreateAudienceVoteBroadcastClientOutput = z.output<
  typeof createAudienceVoteBroadcastClientSchema
>;

export const selectVoteCandidateSchema = createSelectSchema(voteCandidateTable);

export const insertVoteCandidateSchema = createInsertSchema(
  voteCandidateTable,
  {
    audience_vote_id: z.string().trim().min(1, "ID голосування обов’язковий"),
    caption: nullableTrimmedTextSchema(
      1000,
      "Підпис має бути не довшим за 1000 символів"
    ),
    display_name: voteCandidateDisplayNameSchema,
    display_order: voteCandidateDisplayOrderSchema,
    id: z.string().trim().min(1, "ID обов’язковий"),
    internal_name: nullableTrimmedTextSchema(
      160,
      "Внутрішня назва має бути не довшою за 160 символів"
    ),
  }
);

export const createVoteCandidateClientSchema = z.object({
  caption: optionalNullableTrimmedTextSchema(
    1000,
    "Підпис має бути не довшим за 1000 символів"
  ).transform((value) => value ?? null),
  display_name: voteCandidateDisplayNameSchema,
  display_order: voteCandidateDisplayOrderSchema.optional(),
  internal_name: optionalNullableTrimmedTextSchema(
    160,
    "Внутрішня назва має бути не довшою за 160 символів"
  ).transform((value) => value ?? null),
});

export const patchVoteCandidateClientSchema = z.object({
  caption: optionalNullableTrimmedTextSchema(
    1000,
    "Підпис має бути не довшим за 1000 символів"
  ),
  display_name: voteCandidateDisplayNameSchema.optional(),
  display_order: voteCandidateDisplayOrderSchema.optional(),
  internal_name: optionalNullableTrimmedTextSchema(
    160,
    "Внутрішня назва має бути не довшою за 160 символів"
  ),
});

export const patchVoteCandidateMediaClientSchema = z.object({
  archived: z.literal(false).optional(),
  display_order: voteCandidateDisplayOrderSchema.optional(),
});

export type InsertVoteCandidateInput = z.input<
  typeof insertVoteCandidateSchema
>;
export type CreateVoteCandidateClientInput = z.input<
  typeof createVoteCandidateClientSchema
>;
export type CreateVoteCandidateClientOutput = z.output<
  typeof createVoteCandidateClientSchema
>;
export type PatchVoteCandidateClientInput = z.input<
  typeof patchVoteCandidateClientSchema
>;
export type PatchVoteCandidateClientOutput = z.output<
  typeof patchVoteCandidateClientSchema
>;
export type PatchVoteCandidateMediaClientInput = z.input<
  typeof patchVoteCandidateMediaClientSchema
>;
export type PatchVoteCandidateMediaClientOutput = z.output<
  typeof patchVoteCandidateMediaClientSchema
>;

export const selectVoteCandidateMediaSchema = createSelectSchema(
  voteCandidateMediaTable
);

export const insertVoteCandidateMediaSchema = createInsertSchema(
  voteCandidateMediaTable,
  {
    blob_download_url: z.string().url(),
    blob_pathname: z.string().trim().min(1, "Шлях Blob обов’язковий"),
    blob_url: z.string().url(),
    candidate_id: z.string().trim().min(1, "ID кандидата обов’язковий"),
    content_type: z.string().trim().min(1, "Тип контенту обов’язковий"),
    file_name: z
      .string()
      .trim()
      .min(1, "Назва файлу обов’язкова")
      .max(255, "Назва файлу має бути не довшою за 255 символів"),
    file_size_bytes: z.coerce.number().int().min(1).max(104_857_600),
    id: z.string().trim().min(1, "ID обов’язковий"),
  }
);

export type InsertVoteCandidateMediaInput = z.input<
  typeof insertVoteCandidateMediaSchema
>;

export const selectBattleTicketSchema = createSelectSchema(battleTicketTable);

export const insertBattleTicketSchema = createInsertSchema(battleTicketTable, {
  id: z.string().min(1, "ID is required"),
  stripe_event_id: z.string().min(1, "Stripe Event ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  instagram: z.string().min(1, "Instagram handle is required"),
  phone: z.string().min(1, "Phone number is required"),
  nomination_quantity: z.number().int().min(0).optional(),
  date: z.date().optional(),
  archived: z.boolean().optional(),
  mail_sent: z.boolean().optional(),
  comment: z.string().optional(),
});

export const updateBattleTicketSchema = insertBattleTicketSchema.partial();

export type InsertBattleTicketInput = z.infer<typeof insertBattleTicketSchema>;
export type UpdateBattleTicketInput = z.infer<typeof updateBattleTicketSchema>;

export const insertBattleTicketClientSchema = z.object({
  name: z.string().trim().min(1, "Ім’я обов’язкове"),
  email: z
    .string()
    .trim()
    .email("Невалідна адреса")
    .min(1, "Email обов’язковий"),
  phone: z.string().min(9, "Телефон обов’язковий"),
  instagram: z.string().trim().min(1, "Instagram обов’язковий"),
  nomination_quantity: z
    .number()
    .int()
    .min(1, "Кількість номінацій має бути принаймні 1")
    .default(1),
  comment: z.string().optional(),
});

export type InsertBattleTicketClientInput = z.infer<
  typeof insertBattleTicketClientSchema
>;
