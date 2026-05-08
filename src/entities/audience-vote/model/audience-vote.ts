import { z } from "zod";

import {
  audienceVoteKindEnum,
  audienceVoteStatusEnum,
} from "@/shared/db/schema";

const nonEmptyStringSchema = z.string().trim().min(1);
const dateSchema = z.coerce.date();
const nullableDateSchema = z.preprocess(
  (value) => (value === null ? null : value),
  z.coerce.date().nullable()
);

export const audienceVoteIdSchema =
  nonEmptyStringSchema.brand<"AudienceVoteId">();
export type AudienceVoteId = z.infer<typeof audienceVoteIdSchema>;

export const audienceVoteKindSchema = z.enum(
  audienceVoteKindEnum.enumValues
);
export type AudienceVoteKind = z.infer<typeof audienceVoteKindSchema>;

export const audienceVoteStatusSchema = z.enum(
  audienceVoteStatusEnum.enumValues
);
export type AudienceVoteStatus = z.infer<typeof audienceVoteStatusSchema>;

export const createAudienceVoteStatusSchema = z.enum(["draft", "scheduled"]);
export type CreateAudienceVoteStatus = z.infer<
  typeof createAudienceVoteStatusSchema
>;

export const audienceVoteSchema = z.object({
  archived: z.boolean(),
  created_at: dateSchema,
  id: audienceVoteIdSchema,
  kind: audienceVoteKindSchema,
  status: audienceVoteStatusSchema,
  title: nonEmptyStringSchema,
  updated_at: dateSchema,
  window_end: nullableDateSchema,
  window_start: nullableDateSchema,
});

export const audienceVoteListSchema = z.array(audienceVoteSchema);

export type AudienceVote = z.infer<typeof audienceVoteSchema>;
export type AudienceVoteList = z.infer<typeof audienceVoteListSchema>;

export function parseAudienceVote(value: unknown): AudienceVote {
  return audienceVoteSchema.parse(value);
}

export function parseAudienceVoteList(value: unknown): AudienceVote[] {
  return audienceVoteListSchema.parse(value);
}
