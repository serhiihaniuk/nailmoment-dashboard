import { z } from "zod";

import {
  createVoteCandidateClientSchema,
  type CreateVoteCandidateClientOutput,
} from "@/shared/db/schema.zod";

export type VoteCandidateDraft = {
  caption: string;
  display_name: string;
  internal_name: string;
};

export type VoteCandidateFormValues = CreateVoteCandidateClientOutput;

export type VoteCandidateFieldErrors = Partial<
  Record<keyof VoteCandidateDraft, string>
>;

export type VoteCandidateApiError = {
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

type ParseVoteCandidateDraftResult =
  | { data: VoteCandidateFormValues; ok: true }
  | { errors: VoteCandidateFieldErrors; ok: false };

const voteCandidateApiErrorSchema = z.object({
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

const voteCandidateFormSchema = createVoteCandidateClientSchema.omit({
  display_order: true,
});

export function createVoteCandidateDefaultDraft(): VoteCandidateDraft {
  return {
    caption: "",
    display_name: "",
    internal_name: "",
  };
}

export function createVoteCandidateDraftFromValues(values: {
  caption: string | null;
  display_name: string;
  internal_name: string | null;
}): VoteCandidateDraft {
  return {
    caption: values.caption ?? "",
    display_name: values.display_name,
    internal_name: values.internal_name ?? "",
  };
}

export function parseVoteCandidateDraft(
  draft: VoteCandidateDraft
): ParseVoteCandidateDraftResult {
  const parsed = voteCandidateFormSchema.safeParse(draft);

  if (parsed.success) {
    return { data: parsed.data, ok: true };
  }

  return {
    errors: mapVoteCandidateIssues(parsed.error.issues),
    ok: false,
  };
}

export function parseVoteCandidateApiError(
  value: unknown
): VoteCandidateApiError {
  const parsed = voteCandidateApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Could not update vote candidates." };
}

export function mapVoteCandidateApiErrors(
  error: VoteCandidateApiError
): VoteCandidateFieldErrors {
  if (!error.errors) {
    return {};
  }

  return Object.entries(error.errors).reduce<VoteCandidateFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message && isVoteCandidateField(fieldName)) {
        acc[fieldName] = message;
      }

      return acc;
    },
    {}
  );
}

function mapVoteCandidateIssues(
  issues: z.ZodIssue[]
): VoteCandidateFieldErrors {
  return issues.reduce<VoteCandidateFieldErrors>((acc, issue) => {
    const fieldName = issue.path[0];

    if (typeof fieldName === "string" && isVoteCandidateField(fieldName)) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function isVoteCandidateField(
  value: string
): value is keyof VoteCandidateDraft {
  return (
    value === "caption" ||
    value === "display_name" ||
    value === "internal_name"
  );
}
