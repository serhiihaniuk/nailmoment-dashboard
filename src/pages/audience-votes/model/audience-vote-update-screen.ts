import { z } from "zod";

import {
  defaultAudienceVoteUpdateScreen,
  type AudienceVoteUpdateScreen,
} from "@/entities/audience-vote";
import {
  updateAudienceVoteUpdateScreenClientSchema,
  type UpdateAudienceVoteUpdateScreenClientOutput,
} from "@/shared/db/schema.zod";

export type AudienceVoteUpdateScreenFormDraft = {
  message: string;
  title: string;
};

export type AudienceVoteUpdateScreenFormValues =
  UpdateAudienceVoteUpdateScreenClientOutput;

export type AudienceVoteUpdateScreenFieldErrors = Partial<
  Record<keyof AudienceVoteUpdateScreenFormDraft, string>
>;

export type AudienceVoteUpdateScreenApiError = {
  code?: "missing_database_table" | undefined;
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

type ParseUpdateScreenDraftResult =
  | { data: AudienceVoteUpdateScreenFormValues; ok: true }
  | { errors: AudienceVoteUpdateScreenFieldErrors; ok: false };

const audienceVoteUpdateScreenApiErrorSchema = z.object({
  code: z.literal("missing_database_table").optional(),
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

export const audienceVoteUpdateScreenQueryKey = [
  "audienceVoteUpdateScreen",
] as const;

export function createAudienceVoteUpdateScreenDraft(
  updateScreen?: Pick<AudienceVoteUpdateScreen, "message" | "title">
): AudienceVoteUpdateScreenFormDraft {
  return {
    message: updateScreen?.message ?? defaultAudienceVoteUpdateScreen.message,
    title: updateScreen?.title ?? defaultAudienceVoteUpdateScreen.title,
  };
}

export function parseAudienceVoteUpdateScreenDraft(
  draft: AudienceVoteUpdateScreenFormDraft
): ParseUpdateScreenDraftResult {
  const parsed = updateAudienceVoteUpdateScreenClientSchema.safeParse(draft);

  if (parsed.success) {
    return { data: parsed.data, ok: true };
  }

  return {
    errors: mapAudienceVoteUpdateScreenIssues(parsed.error.issues),
    ok: false,
  };
}

export function parseAudienceVoteUpdateScreenApiError(
  value: unknown
): AudienceVoteUpdateScreenApiError {
  const parsed = audienceVoteUpdateScreenApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Не вдалося оновити екран очікування голосування." };
}

export function mapAudienceVoteUpdateScreenApiErrors(
  error: AudienceVoteUpdateScreenApiError
): AudienceVoteUpdateScreenFieldErrors {
  if (!error.errors) {
    return {};
  }

  return Object.entries(error.errors).reduce<AudienceVoteUpdateScreenFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message && isAudienceVoteUpdateScreenField(fieldName)) {
        acc[fieldName] = message;
      }

      return acc;
    },
    {}
  );
}

function mapAudienceVoteUpdateScreenIssues(
  issues: z.ZodIssue[]
): AudienceVoteUpdateScreenFieldErrors {
  return issues.reduce<AudienceVoteUpdateScreenFieldErrors>((acc, issue) => {
    const fieldName = issue.path[0];

    if (
      typeof fieldName === "string" &&
      isAudienceVoteUpdateScreenField(fieldName)
    ) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function isAudienceVoteUpdateScreenField(
  value: string
): value is keyof AudienceVoteUpdateScreenFormDraft {
  return value === "message" || value === "title";
}
