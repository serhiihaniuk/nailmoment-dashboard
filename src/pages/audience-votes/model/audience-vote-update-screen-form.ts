import { z } from "zod";

import type { AudienceVoteUpdateScreenSettings } from "@/entities/audience-vote";
import {
  updateAudienceVoteUpdateScreenClientSchema,
  type UpdateAudienceVoteUpdateScreenClientOutput,
} from "@/shared/db/schema.zod";

export type AudienceVoteUpdateScreenDraft = {
  body: string;
  button_label: string;
  button_url: string;
  headline: string;
};

export type AudienceVoteUpdateScreenFormValues =
  UpdateAudienceVoteUpdateScreenClientOutput;

export type AudienceVoteUpdateScreenFieldErrors = Partial<
  Record<keyof AudienceVoteUpdateScreenDraft, string>
>;

export type AudienceVoteUpdateScreenApiError = {
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

type ParseAudienceVoteUpdateScreenDraftResult =
  | { data: AudienceVoteUpdateScreenFormValues; ok: true }
  | { errors: AudienceVoteUpdateScreenFieldErrors; ok: false };

const audienceVoteUpdateScreenApiErrorSchema = z.object({
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

export function createAudienceVoteUpdateScreenDraft(
  screen?: AudienceVoteUpdateScreenSettings | null
): AudienceVoteUpdateScreenDraft {
  return {
    body: screen?.body ?? "",
    button_label: screen?.button_label ?? "",
    button_url: screen?.button_url ?? "",
    headline: screen?.headline ?? "",
  };
}

export function parseAudienceVoteUpdateScreenDraft(
  draft: AudienceVoteUpdateScreenDraft
): ParseAudienceVoteUpdateScreenDraftResult {
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
    : { message: "Could not update Audience Vote Update Screen." };
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
): value is keyof AudienceVoteUpdateScreenDraft {
  return (
    value === "body" ||
    value === "button_label" ||
    value === "button_url" ||
    value === "headline"
  );
}
