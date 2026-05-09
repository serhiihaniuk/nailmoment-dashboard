import { z } from "zod";

import {
  audienceVoteBroadcastDeliveryStageEnum,
  audienceVoteBroadcastDeliveryStatusEnum,
  audienceVoteBroadcastStatusEnum,
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

export const audienceVoteBroadcastIdSchema =
  nonEmptyStringSchema.brand<"AudienceVoteBroadcastId">();
export type AudienceVoteBroadcastId = z.infer<
  typeof audienceVoteBroadcastIdSchema
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

export const audienceVoteBroadcastStatusSchema = z.enum(
  audienceVoteBroadcastStatusEnum.enumValues
);
export type AudienceVoteBroadcastStatus = z.infer<
  typeof audienceVoteBroadcastStatusSchema
>;

export const audienceVoteBroadcastDeliveryStageSchema = z.enum(
  audienceVoteBroadcastDeliveryStageEnum.enumValues
);
export type AudienceVoteBroadcastDeliveryStage = z.infer<
  typeof audienceVoteBroadcastDeliveryStageSchema
>;

export const audienceVoteBroadcastDeliveryStatusSchema = z.enum(
  audienceVoteBroadcastDeliveryStatusEnum.enumValues
);
export type AudienceVoteBroadcastDeliveryStatus = z.infer<
  typeof audienceVoteBroadcastDeliveryStatusSchema
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

const audienceVoteBroadcastDeliveryCountSchema = z.object({
  failed: z.number().int().min(0),
  pending: z.number().int().min(0),
  sent: z.number().int().min(0),
  skipped: z.number().int().min(0),
});

export const audienceVoteBroadcastDeliveryCountsByStageSchema = z.object({
  normal: audienceVoteBroadcastDeliveryCountSchema,
  operator_canary: audienceVoteBroadcastDeliveryCountSchema,
  voter_canary: audienceVoteBroadcastDeliveryCountSchema,
});

export const audienceVoteBroadcastSchema = z.object({
  audience_vote_id: audienceVoteIdSchema,
  canary_voter_limit: z.number().int().min(0),
  created_at: dateSchema,
  delivery_counts: audienceVoteBroadcastDeliveryCountsByStageSchema,
  estimated_recipient_count: z.number().int().min(0),
  id: audienceVoteBroadcastIdSchema,
  include_open_button: z.boolean(),
  interrupted_at: nullableDateSchema,
  message_text: nonEmptyStringSchema,
  next_stage_at: dateSchema,
  status: audienceVoteBroadcastStatusSchema,
  updated_at: dateSchema,
});

export const audienceVoteBroadcastListSchema = z.array(
  audienceVoteBroadcastSchema
);

export const audienceVoteBroadcastPreviewSchema = z.object({
  audience_vote_id: audienceVoteIdSchema,
  estimated_recipient_count: z.number().int().min(0),
  include_open_button: z.boolean(),
  message_text: nonEmptyStringSchema,
});

export type AudienceVoteBroadcastDeliveryCounts = z.infer<
  typeof audienceVoteBroadcastDeliveryCountSchema
>;
export type AudienceVoteBroadcastDeliveryCountsByStage = z.infer<
  typeof audienceVoteBroadcastDeliveryCountsByStageSchema
>;
export type AudienceVoteBroadcast = z.infer<
  typeof audienceVoteBroadcastSchema
>;
export type AudienceVoteBroadcastList = z.infer<
  typeof audienceVoteBroadcastListSchema
>;
export type AudienceVoteBroadcastPreview = z.infer<
  typeof audienceVoteBroadcastPreviewSchema
>;

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

export const publicVoteCandidateMediaSchema = z.object({
  blob_url: z.string().url(),
  content_type: voteCandidateMediaContentTypeSchema,
  display_order: z.number().int().min(1),
  id: voteCandidateMediaIdSchema,
  media_type: voteCandidateMediaTypeSchema,
});

export const publicVoteCandidateMediaListSchema = z.array(
  publicVoteCandidateMediaSchema
);

export const miniAppVoteCandidateSchema = publicVoteCandidateSchema.extend({
  media: publicVoteCandidateMediaListSchema,
});

export const publicAudienceVoteSchema = z.object({
  id: audienceVoteIdSchema,
  kind: audienceVoteKindSchema,
  title: nonEmptyStringSchema,
  window_end: nullableDateSchema,
  window_start: nullableDateSchema,
});

export const defaultAudienceVoteUpdateScreen = {
  message:
    "\u041d\u0430\u0440\u0430\u0437\u0456 \u043d\u0435\u043c\u0430\u0454 \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u043e\u0433\u043e \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f. \u041c\u0438 \u043f\u043e\u043a\u0430\u0436\u0435\u043c\u043e \u043d\u043e\u0432\u0435 \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f \u0442\u0443\u0442, \u0449\u043e\u0439\u043d\u043e \u0432\u043e\u043d\u043e \u0441\u0442\u0430\u0440\u0442\u0443\u0454.",
  title:
    "\u0413\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f \u0441\u043a\u043e\u0440\u043e",
} as const;

export const defaultAudienceVoteBotSettings = {
  start_button_text:
    "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f",
  start_message:
    "\u041f\u0440\u0438\u0432\u0456\u0442! \u0413\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f Nail Moment \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442\u044c \u0443 Mini App. \u041d\u0430\u0442\u0438\u0441\u043d\u0456\u0442\u044c \u043a\u043d\u043e\u043f\u043a\u0443 \u043d\u0438\u0436\u0447\u0435, \u0449\u043e\u0431 \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f.",
} as const;

export const publicAudienceVoteUpdateScreenSchema = z.object({
  message: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
});

export const audienceVoteUpdateScreenSchema =
  publicAudienceVoteUpdateScreenSchema.extend({
    created_at: dateSchema,
    id: nonEmptyStringSchema,
    updated_at: dateSchema,
  });

export const publicAudienceVoteBotSettingsSchema = z.object({
  start_button_text: nonEmptyStringSchema,
  start_message: nonEmptyStringSchema,
});

export const audienceVoteBotSettingsSchema =
  publicAudienceVoteBotSettingsSchema.extend({
    created_at: dateSchema,
    id: nonEmptyStringSchema,
    updated_at: dateSchema,
  });

export const audienceVoteMiniAppResponseSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      candidates: z.array(miniAppVoteCandidateSchema),
      selected_candidate_id: voteCandidateIdSchema.nullable(),
      status: z.literal("open_vote"),
      vote: publicAudienceVoteSchema,
    }),
    z.object({
      status: z.literal("update_screen"),
      update_screen: publicAudienceVoteUpdateScreenSchema,
    }),
  ]
);

export const saveAudienceVoteMiniAppVoteRequestSchema = z.object({
  audience_vote_id: audienceVoteIdSchema,
  candidate_id: voteCandidateIdSchema,
});

export const audienceVoteMiniAppVoteResponseSchema = z.object({
  audience_vote_id: audienceVoteIdSchema,
  selected_candidate_id: voteCandidateIdSchema,
  status: z.literal("saved"),
});

export const voteCandidateMediaUploadPayloadSchema = z
  .object({
    audienceVoteId: audienceVoteIdSchema,
    candidateId: voteCandidateIdSchema,
    contentType: voteCandidateMediaContentTypeSchema,
    fileName: z
      .string()
      .trim()
      .min(1, "Назва файлу обов’язкова")
      .max(255, "Назва файлу має бути не довшою за 255 символів"),
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
            ? "Фото має бути до 20 MB"
            : "Відео має бути до 100 MB",
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

export const audienceVoteResultItemSchema = z.object({
  candidate_id: voteCandidateIdSchema,
  display_name: nonEmptyStringSchema,
  display_order: z.number().int().min(1),
  internal_name: nullableTextSchema,
  percentage: z.number().min(0).max(100),
  rank: z.number().int().min(1),
  total_votes: z.number().int().min(0),
});

export const audienceVoteResultsSchema = z.object({
  audience_vote_id: audienceVoteIdSchema,
  generated_at: dateSchema,
  results: z.array(audienceVoteResultItemSchema),
  total_votes: z.number().int().min(0),
});

export type VoteCandidate = z.infer<typeof voteCandidateSchema>;
export type VoteCandidateList = z.infer<typeof voteCandidateListSchema>;
export type PublicVoteCandidate = z.infer<typeof publicVoteCandidateSchema>;
export type PublicVoteCandidateMedia = z.infer<
  typeof publicVoteCandidateMediaSchema
>;
export type MiniAppVoteCandidate = z.infer<typeof miniAppVoteCandidateSchema>;
export type PublicAudienceVote = z.infer<typeof publicAudienceVoteSchema>;
export type PublicAudienceVoteUpdateScreen = z.infer<
  typeof publicAudienceVoteUpdateScreenSchema
>;
export type AudienceVoteUpdateScreen = z.infer<
  typeof audienceVoteUpdateScreenSchema
>;
export type PublicAudienceVoteBotSettings = z.infer<
  typeof publicAudienceVoteBotSettingsSchema
>;
export type AudienceVoteBotSettings = z.infer<
  typeof audienceVoteBotSettingsSchema
>;
export type AudienceVoteMiniAppResponse = z.infer<
  typeof audienceVoteMiniAppResponseSchema
>;
export type SaveAudienceVoteMiniAppVoteRequest = z.infer<
  typeof saveAudienceVoteMiniAppVoteRequestSchema
>;
export type AudienceVoteMiniAppVoteResponse = z.infer<
  typeof audienceVoteMiniAppVoteResponseSchema
>;
export type VoteCandidateMediaUploadPayload = z.infer<
  typeof voteCandidateMediaUploadPayloadSchema
>;
export type VoteCandidateMedia = z.infer<typeof voteCandidateMediaSchema>;
export type VoteCandidateMediaList = z.infer<
  typeof voteCandidateMediaListSchema
>;
export type AudienceVoteResultItem = z.infer<
  typeof audienceVoteResultItemSchema
>;
export type AudienceVoteResults = z.infer<typeof audienceVoteResultsSchema>;

export interface AudienceVoteResultCandidateInput {
  display_name: string;
  display_order: number;
  id: string;
  internal_name: string | null;
}

export interface AudienceVoteResultCountInput {
  candidate_id: string;
  total_votes: bigint | number | string;
}

export interface BuildAudienceVoteResultsInput {
  audienceVoteId: string;
  candidates: AudienceVoteResultCandidateInput[];
  generatedAt?: Date;
  voteCounts: AudienceVoteResultCountInput[];
}

export type AudienceVoteOpenValidationIssueCode =
  | "already_open"
  | "another_vote_open"
  | "closed_final"
  | "missing_candidate_media"
  | "missing_kind"
  | "missing_title"
  | "not_enough_candidates"
  | "not_openable_status";

export interface AudienceVoteOpenValidationIssue {
  candidateId?: string;
  code: AudienceVoteOpenValidationIssueCode;
  message: string;
}

export interface AudienceVoteOpenReadinessInput {
  activeCandidates: Array<{ display_name: string; id: string }>;
  activeMediaCountsByCandidateId: ReadonlyMap<string, number>;
  otherOpenVote?: { id: string; title: string } | null;
  vote: {
    id: string;
    kind: string;
    status: AudienceVoteStatus;
    title: string;
  };
}

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

export function buildAudienceVoteResults({
  audienceVoteId,
  candidates,
  generatedAt = new Date(),
  voteCounts,
}: BuildAudienceVoteResultsInput): AudienceVoteResults {
  const totalVotesByCandidateId = new Map(
    voteCounts.map((row) => [
      row.candidate_id,
      normalizeVoteCount(row.total_votes),
    ])
  );
  const totalVotes = candidates.reduce(
    (sum, candidate) => sum + (totalVotesByCandidateId.get(candidate.id) ?? 0),
    0
  );

  const rankedResults = candidates
    .map((candidate) => {
      const candidateVotes = totalVotesByCandidateId.get(candidate.id) ?? 0;

      return {
        candidate_id: candidate.id,
        display_name: candidate.display_name,
        display_order: candidate.display_order,
        internal_name: candidate.internal_name,
        percentage: calculateVotePercentage(candidateVotes, totalVotes),
        total_votes: candidateVotes,
      };
    })
    .sort(
      (first, second) =>
        second.total_votes - first.total_votes ||
        first.display_order - second.display_order ||
        first.display_name.localeCompare(second.display_name)
    )
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }));

  return parseAudienceVoteResults({
    audience_vote_id: audienceVoteId,
    generated_at: generatedAt,
    results: rankedResults,
    total_votes: totalVotes,
  });
}

export function validateAudienceVoteOpenReadiness({
  activeCandidates,
  activeMediaCountsByCandidateId,
  otherOpenVote,
  vote,
}: AudienceVoteOpenReadinessInput): AudienceVoteOpenValidationIssue[] {
  const issues: AudienceVoteOpenValidationIssue[] = [];

  if (vote.title.trim().length === 0) {
    issues.push({
      code: "missing_title",
      message: "Назва голосування обов’язкова перед відкриттям.",
    });
  }

  if (!audienceVoteKindSchema.safeParse(vote.kind).success) {
    issues.push({
      code: "missing_kind",
      message: "Тип голосування обов’язковий перед відкриттям.",
    });
  }

  if (vote.status === "closed") {
    issues.push({
      code: "closed_final",
      message: "Закриті голосування не можна відкрити повторно.",
    });
  } else if (vote.status === "open") {
    issues.push({
      code: "already_open",
      message: "Це голосування вже відкрите.",
    });
  } else if (vote.status !== "draft" && vote.status !== "scheduled") {
    issues.push({
      code: "not_openable_status",
      message: "Відкрити можна лише чернетку або заплановане голосування.",
    });
  }

  if (otherOpenVote && otherOpenVote.id !== vote.id) {
    issues.push({
      code: "another_vote_open",
      message: `Інше голосування вже відкрите: ${otherOpenVote.title}.`,
    });
  }

  if (activeCandidates.length < 2) {
    issues.push({
      code: "not_enough_candidates",
      message: "Перед відкриттям потрібно щонайменше двоє активних кандидатів.",
    });
  }

  for (const candidate of activeCandidates) {
    const activeMediaCount =
      activeMediaCountsByCandidateId.get(candidate.id) ?? 0;

    if (activeMediaCount < 1) {
      issues.push({
        candidateId: candidate.id,
        code: "missing_candidate_media",
        message: `${candidate.display_name} потребує щонайменше одне активне медіа перед відкриттям.`,
      });
    }
  }

  return issues;
}

export function parseAudienceVote(value: unknown): AudienceVote {
  return audienceVoteSchema.parse(value);
}

export function parseAudienceVoteList(value: unknown): AudienceVote[] {
  return audienceVoteListSchema.parse(value);
}

export function parseAudienceVoteBroadcast(
  value: unknown
): AudienceVoteBroadcast {
  return audienceVoteBroadcastSchema.parse(value);
}

export function parseAudienceVoteBroadcastList(
  value: unknown
): AudienceVoteBroadcast[] {
  return audienceVoteBroadcastListSchema.parse(value);
}

export function parseAudienceVoteBroadcastPreview(
  value: unknown
): AudienceVoteBroadcastPreview {
  return audienceVoteBroadcastPreviewSchema.parse(value);
}

export function parseAudienceVoteUpdateScreen(
  value: unknown
): AudienceVoteUpdateScreen {
  return audienceVoteUpdateScreenSchema.parse(value);
}

export function parseAudienceVoteBotSettings(
  value: unknown
): AudienceVoteBotSettings {
  return audienceVoteBotSettingsSchema.parse(value);
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

export function parseAudienceVoteMiniAppResponse(
  value: unknown
): AudienceVoteMiniAppResponse {
  return audienceVoteMiniAppResponseSchema.parse(value);
}

export function parseAudienceVoteMiniAppVoteResponse(
  value: unknown
): AudienceVoteMiniAppVoteResponse {
  return audienceVoteMiniAppVoteResponseSchema.parse(value);
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

export function parseAudienceVoteResults(
  value: unknown
): AudienceVoteResults {
  return audienceVoteResultsSchema.parse(value);
}

function normalizeVoteCount(value: bigint | number | string): number {
  const count = Number(value);

  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Vote totals must be non-negative safe integers.");
  }

  return count;
}

function calculateVotePercentage(votes: number, totalVotes: number): number {
  if (totalVotes === 0) {
    return 0;
  }

  return Number(((votes / totalVotes) * 100).toFixed(1));
}
