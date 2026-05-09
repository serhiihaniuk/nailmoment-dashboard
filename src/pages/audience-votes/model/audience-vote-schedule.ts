import { z } from "zod";

import type { AudienceVote, CreateAudienceVoteStatus } from "@/entities/audience-vote";
import {
  patchAudienceVoteScheduleClientSchema,
  type PatchAudienceVoteScheduleClientOutput,
} from "@/shared/db/schema.zod";

export type AudienceVoteScheduleDraft = {
  status: CreateAudienceVoteStatus;
  window_end: string;
  window_start: string;
};

export type AudienceVoteScheduleFormValues =
  PatchAudienceVoteScheduleClientOutput;

export type AudienceVoteScheduleFieldErrors = Partial<
  Record<keyof AudienceVoteScheduleDraft, string>
>;

export type AudienceVoteScheduleApiError = {
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

type ParseAudienceVoteScheduleDraftResult =
  | { data: AudienceVoteScheduleFormValues; ok: true }
  | { errors: AudienceVoteScheduleFieldErrors; ok: false };

const audienceVoteScheduleApiErrorSchema = z.object({
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

export function createAudienceVoteScheduleDraft(
  vote: AudienceVote
): AudienceVoteScheduleDraft {
  return {
    status: vote.status === "scheduled" ? "scheduled" : "draft",
    window_end: formatDateTimeLocalInput(vote.window_end),
    window_start: formatDateTimeLocalInput(vote.window_start),
  };
}

export function parseAudienceVoteScheduleDraft(
  draft: AudienceVoteScheduleDraft
): ParseAudienceVoteScheduleDraftResult {
  const parsed = patchAudienceVoteScheduleClientSchema.safeParse(draft);

  if (parsed.success) {
    return { data: parsed.data, ok: true };
  }

  return {
    errors: mapAudienceVoteScheduleIssues(parsed.error.issues),
    ok: false,
  };
}

export function parseAudienceVoteScheduleApiError(
  value: unknown
): AudienceVoteScheduleApiError {
  const parsed = audienceVoteScheduleApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Не вдалося оновити розклад голосування." };
}

export function mapAudienceVoteScheduleApiErrors(
  error: AudienceVoteScheduleApiError
): AudienceVoteScheduleFieldErrors {
  if (!error.errors) {
    return {};
  }

  return Object.entries(error.errors).reduce<AudienceVoteScheduleFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message && isAudienceVoteScheduleField(fieldName)) {
        acc[fieldName] = message;
      }

      return acc;
    },
    {}
  );
}

function formatDateTimeLocalInput(value: Date | null): string {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = padDatePart(value.getMonth() + 1);
  const day = padDatePart(value.getDate());
  const hours = padDatePart(value.getHours());
  const minutes = padDatePart(value.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function mapAudienceVoteScheduleIssues(
  issues: z.ZodIssue[]
): AudienceVoteScheduleFieldErrors {
  return issues.reduce<AudienceVoteScheduleFieldErrors>((acc, issue) => {
    const fieldName = issue.path[0];

    if (
      typeof fieldName === "string" &&
      isAudienceVoteScheduleField(fieldName)
    ) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function isAudienceVoteScheduleField(
  value: string
): value is keyof AudienceVoteScheduleDraft {
  return (
    value === "status" ||
    value === "window_end" ||
    value === "window_start"
  );
}
