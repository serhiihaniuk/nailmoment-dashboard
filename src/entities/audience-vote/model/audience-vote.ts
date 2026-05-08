import { z } from "zod";

import {
  audienceVoteKindEnum,
  audienceVoteStatusEnum,
  voteCandidateMediaTypeEnum,
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

export const voteCandidateMediaIdSchema =
  nonEmptyStringSchema.brand<"VoteCandidateMediaId">();
export type VoteCandidateMediaId = z.infer<
  typeof voteCandidateMediaIdSchema
>;

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

export const voteCandidateMediaTypeSchema = z.enum(
  voteCandidateMediaTypeEnum.enumValues
);
export type VoteCandidateMediaType = z.infer<
  typeof voteCandidateMediaTypeSchema
>;

export const VOTE_CANDIDATE_PHOTO_MAX_BYTES = 20 * 1024 * 1024;
export const VOTE_CANDIDATE_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

export const VOTE_CANDIDATE_PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const VOTE_CANDIDATE_VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const VOTE_CANDIDATE_MEDIA_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const VOTE_CANDIDATE_MEDIA_ACCEPT =
  VOTE_CANDIDATE_MEDIA_CONTENT_TYPES.join(",");

export const voteCandidateMediaContentTypeSchema = z.enum(
  VOTE_CANDIDATE_MEDIA_CONTENT_TYPES
);
export type VoteCandidateMediaContentType = z.infer<
  typeof voteCandidateMediaContentTypeSchema
>;

const voteCandidateMediaContentTypeConfig = {
  "image/heic": {
    extension: "heic",
    maxSizeBytes: VOTE_CANDIDATE_PHOTO_MAX_BYTES,
    mediaType: "photo",
  },
  "image/heif": {
    extension: "heif",
    maxSizeBytes: VOTE_CANDIDATE_PHOTO_MAX_BYTES,
    mediaType: "photo",
  },
  "image/jpeg": {
    extension: "jpg",
    maxSizeBytes: VOTE_CANDIDATE_PHOTO_MAX_BYTES,
    mediaType: "photo",
  },
  "image/png": {
    extension: "png",
    maxSizeBytes: VOTE_CANDIDATE_PHOTO_MAX_BYTES,
    mediaType: "photo",
  },
  "image/webp": {
    extension: "webp",
    maxSizeBytes: VOTE_CANDIDATE_PHOTO_MAX_BYTES,
    mediaType: "photo",
  },
  "video/mp4": {
    extension: "mp4",
    maxSizeBytes: VOTE_CANDIDATE_VIDEO_MAX_BYTES,
    mediaType: "video",
  },
  "video/quicktime": {
    extension: "mov",
    maxSizeBytes: VOTE_CANDIDATE_VIDEO_MAX_BYTES,
    mediaType: "video",
  },
  "video/webm": {
    extension: "webm",
    maxSizeBytes: VOTE_CANDIDATE_VIDEO_MAX_BYTES,
    mediaType: "video",
  },
} satisfies Record<
  VoteCandidateMediaContentType,
  {
    extension: string;
    maxSizeBytes: number;
    mediaType: VoteCandidateMediaType;
  }
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

export const voteCandidateMediaUploadPayloadSchema = z
  .object({
    audienceVoteId: audienceVoteIdSchema,
    candidateId: voteCandidateIdSchema,
    contentType: voteCandidateMediaContentTypeSchema,
    fileName: z
      .string()
      .trim()
      .min(1, "File name is required")
      .max(255, "File name must be 255 characters or fewer"),
    mediaId: voteCandidateMediaIdSchema,
    replacesMediaId: voteCandidateMediaIdSchema.nullable().optional(),
    sizeBytes: z.number().int().min(1).max(VOTE_CANDIDATE_VIDEO_MAX_BYTES),
  })
  .superRefine((value, ctx) => {
    const limit = getVoteCandidateMediaMaxSizeBytes(value.contentType);

    if (value.sizeBytes > limit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          getVoteCandidateMediaTypeForContentType(value.contentType) === "photo"
            ? "Photos must be 20 MB or less"
            : "Videos must be 100 MB or less",
        path: ["sizeBytes"],
      });
    }
  });

export const voteCandidateMediaSchema = z.object({
  archived: z.boolean(),
  blob_download_url: z.string().url(),
  blob_pathname: nonEmptyStringSchema,
  blob_url: z.string().url(),
  candidate_id: voteCandidateIdSchema,
  content_type: voteCandidateMediaContentTypeSchema,
  created_at: dateSchema,
  display_order: z.number().int().min(1),
  file_name: nonEmptyStringSchema,
  file_size_bytes: z.number().int().min(1),
  id: voteCandidateMediaIdSchema,
  media_type: voteCandidateMediaTypeSchema,
  updated_at: dateSchema,
});

export const voteCandidateMediaListSchema = z.array(
  voteCandidateMediaSchema
);

export type VoteCandidate = z.infer<typeof voteCandidateSchema>;
export type VoteCandidateList = z.infer<typeof voteCandidateListSchema>;
export type PublicVoteCandidate = z.infer<typeof publicVoteCandidateSchema>;
export type VoteCandidateMediaUploadPayload = z.infer<
  typeof voteCandidateMediaUploadPayloadSchema
>;
export type VoteCandidateMedia = z.infer<typeof voteCandidateMediaSchema>;
export type VoteCandidateMediaList = z.infer<
  typeof voteCandidateMediaListSchema
>;

export function getVoteCandidateMediaTypeForContentType(
  contentType: VoteCandidateMediaContentType
): VoteCandidateMediaType {
  return voteCandidateMediaContentTypeConfig[contentType].mediaType;
}

export function getVoteCandidateMediaMaxSizeBytes(
  contentType: VoteCandidateMediaContentType
): number {
  return voteCandidateMediaContentTypeConfig[contentType].maxSizeBytes;
}

export function buildVoteCandidateMediaPath({
  audienceVoteId,
  candidateId,
  contentType,
  mediaId,
}: Pick<
  VoteCandidateMediaUploadPayload,
  "audienceVoteId" | "candidateId" | "contentType" | "mediaId"
>): string {
  const extension = voteCandidateMediaContentTypeConfig[contentType].extension;

  return [
    "audience-votes",
    audienceVoteId,
    "candidates",
    candidateId,
    "media",
    `${mediaId}.${extension}`,
  ].join("/");
}

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

export function parseVoteCandidateMedia(
  value: unknown
): VoteCandidateMedia {
  return voteCandidateMediaSchema.parse(value);
}

export function parseVoteCandidateMediaList(
  value: unknown
): VoteCandidateMedia[] {
  return voteCandidateMediaListSchema.parse(value);
}
