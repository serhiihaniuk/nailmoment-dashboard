import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
} from "drizzle-zod";
import {
  audienceVoteKindEnum,
  audienceVoteStatusEnum,
  audienceVoteTable,
  audienceVoteUpdateScreenTable,
  battleTicketTable,
  cookieConsentActionEnum,
  cookieConsentEventTable,
  cookieConsentSurfaceEnum,
  paymentInstallmentTable,
  ticketFinanceTable,
  ticketTable,
  voteCandidateMediaTable,
  voteCandidateTable,
} from "./schema";
import { TICKET_TYPE_LIST } from "./ticket-grade";

export const selectTicketSchema = createSelectSchema(ticketTable);

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
      message: "Window end must be after window start",
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
  .min(1, "Title is required")
  .max(160, "Title must be 160 characters or fewer");
const audienceVoteUpdateScreenHeadlineSchema = z
  .string()
  .trim()
  .min(1, "Headline is required")
  .max(120, "Headline must be 120 characters or fewer");
const audienceVoteUpdateScreenBodySchema = z
  .string()
  .trim()
  .min(1, "Body is required")
  .max(1000, "Body must be 1000 characters or fewer");
const voteCandidateDisplayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(160, "Display name must be 160 characters or fewer");
const voteCandidateDisplayOrderSchema = z.coerce
  .number()
  .int()
  .min(1, "Display order must be at least 1")
  .max(1000, "Display order must be 1000 or less");

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

function optionalNullableTrimmedTextSchema(max: number, message: string) {
  return z.preprocess(
    normalizeOptionalText,
    z.string().max(max, message).nullable().optional()
  );
}

function optionalNullableUrlSchema(max: number, message: string) {
  return z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .url("Button link must be a valid URL")
      .max(max, message)
      .nullable()
      .optional()
  );
}

function validateAudienceVoteUpdateScreenButton(
  value: { button_label?: string | null; button_url?: string | null },
  ctx: z.RefinementCtx
) {
  const hasLabel = Boolean(value.button_label);
  const hasUrl = Boolean(value.button_url);

  if (hasLabel === hasUrl) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Button label and link must be filled together",
    path: hasLabel ? ["button_url"] : ["button_label"],
  });
}

export const selectAudienceVoteSchema = createSelectSchema(audienceVoteTable);

export const insertAudienceVoteSchema = createInsertSchema(
  audienceVoteTable,
  {
    id: z.string().trim().min(1, "ID is required"),
    kind: z.enum(audienceVoteKindEnum.enumValues),
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

export type InsertAudienceVoteInput = z.input<
  typeof insertAudienceVoteSchema
>;
export type CreateAudienceVoteClientInput = z.input<
  typeof createAudienceVoteClientSchema
>;
export type CreateAudienceVoteClientOutput = z.output<
  typeof createAudienceVoteClientSchema
>;

export const selectAudienceVoteUpdateScreenSchema = createSelectSchema(
  audienceVoteUpdateScreenTable
);

export const insertAudienceVoteUpdateScreenSchema = createInsertSchema(
  audienceVoteUpdateScreenTable,
  {
    body: audienceVoteUpdateScreenBodySchema,
    button_label: nullableTrimmedTextSchema(
      80,
      "Button label must be 80 characters or fewer"
    ),
    button_url: z.preprocess(
      normalizeOptionalText,
      z
        .string()
        .url("Button link must be a valid URL")
        .max(500, "Button link must be 500 characters or fewer")
        .nullable()
    ),
    headline: audienceVoteUpdateScreenHeadlineSchema,
    id: z.string().trim().min(1, "ID is required"),
  }
).superRefine(validateAudienceVoteUpdateScreenButton);

export const updateAudienceVoteUpdateScreenClientSchema = z
  .object({
    body: audienceVoteUpdateScreenBodySchema,
    button_label: optionalNullableTrimmedTextSchema(
      80,
      "Button label must be 80 characters or fewer"
    ).transform((value) => value ?? null),
    button_url: optionalNullableUrlSchema(
      500,
      "Button link must be 500 characters or fewer"
    ).transform((value) => value ?? null),
    headline: audienceVoteUpdateScreenHeadlineSchema,
  })
  .superRefine(validateAudienceVoteUpdateScreenButton);

export type InsertAudienceVoteUpdateScreenInput = z.input<
  typeof insertAudienceVoteUpdateScreenSchema
>;
export type UpdateAudienceVoteUpdateScreenClientInput = z.input<
  typeof updateAudienceVoteUpdateScreenClientSchema
>;
export type UpdateAudienceVoteUpdateScreenClientOutput = z.output<
  typeof updateAudienceVoteUpdateScreenClientSchema
>;

export const selectVoteCandidateSchema = createSelectSchema(voteCandidateTable);

export const insertVoteCandidateSchema = createInsertSchema(
  voteCandidateTable,
  {
    audience_vote_id: z.string().trim().min(1, "Audience Vote ID is required"),
    caption: nullableTrimmedTextSchema(
      1000,
      "Caption must be 1000 characters or fewer"
    ),
    display_name: voteCandidateDisplayNameSchema,
    display_order: voteCandidateDisplayOrderSchema,
    id: z.string().trim().min(1, "ID is required"),
    internal_name: nullableTrimmedTextSchema(
      160,
      "Internal name must be 160 characters or fewer"
    ),
  }
);

export const createVoteCandidateClientSchema = z.object({
  caption: optionalNullableTrimmedTextSchema(
    1000,
    "Caption must be 1000 characters or fewer"
  ).transform((value) => value ?? null),
  display_name: voteCandidateDisplayNameSchema,
  display_order: voteCandidateDisplayOrderSchema.optional(),
  internal_name: optionalNullableTrimmedTextSchema(
    160,
    "Internal name must be 160 characters or fewer"
  ).transform((value) => value ?? null),
});

export const patchVoteCandidateClientSchema = z.object({
  caption: optionalNullableTrimmedTextSchema(
    1000,
    "Caption must be 1000 characters or fewer"
  ),
  display_name: voteCandidateDisplayNameSchema.optional(),
  display_order: voteCandidateDisplayOrderSchema.optional(),
  internal_name: optionalNullableTrimmedTextSchema(
    160,
    "Internal name must be 160 characters or fewer"
  ),
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

export const selectVoteCandidateMediaSchema = createSelectSchema(
  voteCandidateMediaTable
);

export const insertVoteCandidateMediaSchema = createInsertSchema(
  voteCandidateMediaTable,
  {
    blob_download_url: z.string().url(),
    blob_pathname: z.string().trim().min(1, "Blob pathname is required"),
    blob_url: z.string().url(),
    candidate_id: z.string().trim().min(1, "Vote Candidate ID is required"),
    content_type: z.string().trim().min(1, "Content type is required"),
    file_name: z
      .string()
      .trim()
      .min(1, "File name is required")
      .max(255, "File name must be 255 characters or fewer"),
    file_size_bytes: z.coerce.number().int().min(1).max(104_857_600),
    id: z.string().trim().min(1, "ID is required"),
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
