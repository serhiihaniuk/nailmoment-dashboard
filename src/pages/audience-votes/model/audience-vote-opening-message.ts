import { z } from "zod";

import type { AudienceVote } from "@/entities/audience-vote";
import { patchAudienceVoteScheduleClientSchema } from "@/shared/db/schema.zod";
import type {
  AudienceVoteScheduleApiError,
  AudienceVoteScheduleFormValues,
} from "./audience-vote-schedule";

export type AudienceVoteOpeningMessageDraft = {
  enabled: boolean;
  include_open_button: boolean;
  message_text: string;
};

export type AudienceVoteOpeningMessageFormValues =
  AudienceVoteScheduleFormValues;

export type AudienceVoteOpeningMessageFieldErrors = Partial<
  Record<keyof AudienceVoteOpeningMessageDraft, string>
>;

type ParseAudienceVoteOpeningMessageDraftResult =
  | { data: AudienceVoteOpeningMessageFormValues; ok: true }
  | { errors: AudienceVoteOpeningMessageFieldErrors; ok: false };

export function createAudienceVoteOpeningMessageDraft(
  vote: AudienceVote
): AudienceVoteOpeningMessageDraft {
  return {
    enabled: vote.opening_broadcast_message_text !== null,
    include_open_button: vote.opening_broadcast_include_open_button,
    message_text: vote.opening_broadcast_message_text ?? "",
  };
}

export function parseAudienceVoteOpeningMessageDraft({
  draft,
  vote,
}: {
  draft: AudienceVoteOpeningMessageDraft;
  vote: AudienceVote;
}): ParseAudienceVoteOpeningMessageDraftResult {
  const parsed = patchAudienceVoteScheduleClientSchema.safeParse({
    opening_broadcast: draft.enabled
      ? {
          include_open_button: draft.include_open_button,
          message_text: draft.message_text,
        }
      : null,
    status: vote.status,
    window_end: vote.window_end,
    window_start: vote.window_start,
  });

  if (parsed.success) {
    return { data: parsed.data, ok: true };
  }

  return {
    errors: mapAudienceVoteOpeningMessageIssues(parsed.error.issues),
    ok: false,
  };
}

export function mapAudienceVoteOpeningMessageApiErrors(
  error: AudienceVoteScheduleApiError
): AudienceVoteOpeningMessageFieldErrors {
  if (!error.errors) {
    return {};
  }

  return Object.entries(
    error.errors
  ).reduce<AudienceVoteOpeningMessageFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];
      const openingMessageField =
        mapAudienceVoteOpeningMessageFieldName(fieldName);

      if (message && openingMessageField) {
        acc[openingMessageField] = message;
      }

      return acc;
    },
    {}
  );
}

function mapAudienceVoteOpeningMessageIssues(
  issues: z.ZodIssue[]
): AudienceVoteOpeningMessageFieldErrors {
  return issues.reduce<AudienceVoteOpeningMessageFieldErrors>((acc, issue) => {
    const fieldName = mapAudienceVoteOpeningMessageIssuePath(issue.path);

    if (fieldName) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function mapAudienceVoteOpeningMessageIssuePath(
  path: (string | number)[]
): keyof AudienceVoteOpeningMessageDraft | null {
  const fieldName = path[0];

  if (fieldName === "opening_broadcast") {
    return path[1] === "include_open_button"
      ? "include_open_button"
      : "message_text";
  }

  return typeof fieldName === "string"
    ? mapAudienceVoteOpeningMessageFieldName(fieldName)
    : null;
}

function mapAudienceVoteOpeningMessageFieldName(
  value: string
): keyof AudienceVoteOpeningMessageDraft | null {
  if (isAudienceVoteOpeningMessageField(value)) {
    return value;
  }

  if (
    value === "opening_broadcast" ||
    value === "opening_broadcast.message_text" ||
    value === "opening_broadcast_message_text"
  ) {
    return "message_text";
  }

  if (
    value === "opening_broadcast.include_open_button" ||
    value === "opening_broadcast_include_open_button"
  ) {
    return "include_open_button";
  }

  return null;
}

function isAudienceVoteOpeningMessageField(
  value: string
): value is keyof AudienceVoteOpeningMessageDraft {
  return (
    value === "enabled" ||
    value === "include_open_button" ||
    value === "message_text"
  );
}
