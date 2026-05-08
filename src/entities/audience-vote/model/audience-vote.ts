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

export const voteCandidateIdSchema =
  nonEmptyStringSchema.brand<"VoteCandidateId">();
export type VoteCandidateId = z.infer<typeof voteCandidateIdSchema>;

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

const nullableTextSchema = z.string().nullable();

export const voteCandidateSchema = z.object({
  archived: z.boolean(),
  audience_vote_id: audienceVoteIdSchema,
  caption: nullableTextSchema,
  created_at: dateSchema,
  display_name: nonEmptyStringSchema,
  display_order: z.number().int().min(1),
  id: voteCandidateIdSchema,
  internal_name: nullableTextSchema,
  updated_at: dateSchema,
});

export const voteCandidateListSchema = z.array(voteCandidateSchema);

export const publicVoteCandidateSchema = z.object({
  caption: nullableTextSchema,
  display_name: nonEmptyStringSchema,
  display_order: z.number().int().min(1),
  id: voteCandidateIdSchema,
});

export const publicVoteCandidateListSchema = z.array(
  publicVoteCandidateSchema
);

export type VoteCandidate = z.infer<typeof voteCandidateSchema>;
export type VoteCandidateList = z.infer<typeof voteCandidateListSchema>;
export type PublicVoteCandidate = z.infer<typeof publicVoteCandidateSchema>;

export function parseAudienceVote(value: unknown): AudienceVote {
  return audienceVoteSchema.parse(value);
}

export function parseAudienceVoteList(value: unknown): AudienceVote[] {
  return audienceVoteListSchema.parse(value);
}

export function parseVoteCandidate(value: unknown): VoteCandidate {
  return voteCandidateSchema.parse(value);
}

export function parseVoteCandidateList(value: unknown): VoteCandidate[] {
  return voteCandidateListSchema.parse(value);
}

export function parsePublicVoteCandidate(
  value: unknown
): PublicVoteCandidate {
  return publicVoteCandidateSchema.parse(value);
}

export function parsePublicVoteCandidateList(
  value: unknown
): PublicVoteCandidate[] {
  return publicVoteCandidateListSchema.parse(value);
}
