import { z } from "zod";

import {
  getVoteCandidateMediaMaxSizeBytes,
  getVoteCandidateMediaTypeForContentType,
  voteCandidateMediaContentTypeSchema,
  type VoteCandidateMediaContentType,
  type VoteCandidateMediaType,
} from "@/entities/audience-vote";

const browserPreviewableImageContentTypes = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type VoteCandidateMediaApiError = {
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

export type ResolvedVoteCandidateMediaFile =
  | {
      contentType: VoteCandidateMediaContentType;
      mediaType: VoteCandidateMediaType;
      ok: true;
    }
  | { message: string; ok: false };

const voteCandidateMediaApiErrorSchema = z.object({
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

export function parseVoteCandidateMediaApiError(
  value: unknown
): VoteCandidateMediaApiError {
  const parsed = voteCandidateMediaApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Не вдалося оновити медіа кандидата." };
}

export function resolveVoteCandidateMediaFile(
  file: File
): ResolvedVoteCandidateMediaFile {
  const parsedContentType = voteCandidateMediaContentTypeSchema.safeParse(
    file.type
  );

  if (!parsedContentType.success) {
    return {
      message: "Використайте медіа у форматі JPG, PNG, WebP, HEIC, MP4, MOV або WebM.",
      ok: false,
    };
  }

  const contentType = parsedContentType.data;
  const limit = getVoteCandidateMediaMaxSizeBytes(contentType);

  if (file.size > limit) {
    return {
      message:
        getVoteCandidateMediaTypeForContentType(contentType) === "photo"
          ? "Фото має бути до 20 MB."
          : "Відео має бути до 100 MB.",
      ok: false,
    };
  }

  return {
    contentType,
    mediaType: getVoteCandidateMediaTypeForContentType(contentType),
    ok: true,
  };
}

export function formatVoteCandidateMediaFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(bytes / 1024, 1).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatVoteCandidateMediaType(
  mediaType: VoteCandidateMediaType
): string {
  return mediaType === "photo" ? "Фото" : "Відео";
}

export function canBrowserPreviewVoteCandidateMedia({
  contentType,
  mediaType,
}: {
  contentType: string;
  mediaType: VoteCandidateMediaType;
}): boolean {
  if (mediaType === "video") {
    return true;
  }

  return browserPreviewableImageContentTypes.has(contentType);
}
