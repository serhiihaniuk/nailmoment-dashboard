import { z } from "zod";

import {
  type AudienceVote,
  type AudienceVoteKind,
  type AudienceVoteStatus,
  type CreateAudienceVoteStatus,
} from "@/entities/audience-vote";
import {
  createAudienceVoteClientSchema,
  type CreateAudienceVoteClientOutput,
} from "@/shared/db/schema.zod";

export type CreateAudienceVoteFormDraft = {
  kind: AudienceVoteKind;
  status: CreateAudienceVoteStatus;
  title: string;
  window_end: string;
  window_start: string;
};

export type CreateAudienceVoteFormValues = CreateAudienceVoteClientOutput;

export type CreateAudienceVoteFieldErrors = Partial<
  Record<keyof CreateAudienceVoteFormDraft, string>
>;

export type CreateAudienceVoteApiError = {
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

type ParseCreateAudienceVoteDraftResult =
  | { data: CreateAudienceVoteFormValues; ok: true }
  | { errors: CreateAudienceVoteFieldErrors; ok: false };

const createAudienceVoteApiErrorSchema = z.object({
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

const kindLabels: Record<AudienceVoteKind, string> = {
  battle: "Battle",
  final_battle: "Final battle",
  speaker: "Speaker",
};

const statusLabels: Record<AudienceVoteStatus, string> = {
  closed: "Closed",
  draft: "Draft",
  open: "Open",
  scheduled: "Scheduled",
};

export const audienceVoteKindOptions = [
  { label: kindLabels.speaker, value: "speaker" },
  { label: kindLabels.battle, value: "battle" },
  { label: kindLabels.final_battle, value: "final_battle" },
] satisfies Array<{ label: string; value: AudienceVoteKind }>;

export const createAudienceVoteStatusOptions = [
  { label: statusLabels.draft, value: "draft" },
  { label: statusLabels.scheduled, value: "scheduled" },
] satisfies Array<{ label: string; value: CreateAudienceVoteStatus }>;

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

export function createAudienceVoteDefaultDraft(): CreateAudienceVoteFormDraft {
  return {
    kind: "speaker",
    status: "draft",
    title: "",
    window_end: "",
    window_start: "",
  };
}

export function parseCreateAudienceVoteDraft(
  draft: CreateAudienceVoteFormDraft
): ParseCreateAudienceVoteDraftResult {
  const parsed = createAudienceVoteClientSchema.safeParse(draft);

  if (parsed.success) {
    return { data: parsed.data, ok: true };
  }

  return {
    errors: mapCreateAudienceVoteIssues(parsed.error.issues),
    ok: false,
  };
}

export function parseCreateAudienceVoteApiError(
  value: unknown
): CreateAudienceVoteApiError {
  const parsed = createAudienceVoteApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Could not create audience vote." };
}

export function mapCreateAudienceVoteApiErrors(
  error: CreateAudienceVoteApiError
): CreateAudienceVoteFieldErrors {
  if (!error.errors) {
    return {};
  }

  return Object.entries(error.errors).reduce<CreateAudienceVoteFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message && isCreateAudienceVoteField(fieldName)) {
        acc[fieldName] = message;
      }

      return acc;
    },
    {}
  );
}

export function formatAudienceVoteKind(kind: AudienceVoteKind) {
  return kindLabels[kind];
}

export function formatAudienceVoteStatus(status: AudienceVoteStatus) {
  return statusLabels[status];
}

export function formatAudienceVoteDate(value: Date) {
  return dateTimeFormatter.format(value);
}

export function formatAudienceVoteWindow(vote: AudienceVote) {
  if (vote.window_start && vote.window_end) {
    return `${formatAudienceVoteDate(vote.window_start)} - ${formatAudienceVoteDate(vote.window_end)}`;
  }

  if (vote.window_start) {
    return `From ${formatAudienceVoteDate(vote.window_start)}`;
  }

  if (vote.window_end) {
    return `Until ${formatAudienceVoteDate(vote.window_end)}`;
  }

  return "Not planned";
}

function mapCreateAudienceVoteIssues(
  issues: z.ZodIssue[]
): CreateAudienceVoteFieldErrors {
  return issues.reduce<CreateAudienceVoteFieldErrors>((acc, issue) => {
    const fieldName = issue.path[0];

    if (typeof fieldName === "string" && isCreateAudienceVoteField(fieldName)) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function isCreateAudienceVoteField(
  value: string
): value is keyof CreateAudienceVoteFormDraft {
  return (
    value === "kind" ||
    value === "status" ||
    value === "title" ||
    value === "window_end" ||
    value === "window_start"
  );
}
