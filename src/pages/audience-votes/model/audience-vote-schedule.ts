import { z } from "zod";

import type { AudienceVote, AudienceVoteStatus } from "@/entities/audience-vote";
import { doTimeWindowsOverlap, type TimeWindow } from "@/shared/lib/time-window";
import {
  patchAudienceVoteScheduleClientSchema,
  type PatchAudienceVoteScheduleClientOutput,
} from "@/shared/db/schema.zod";

export type AudienceVoteScheduleDraft = {
  opening_broadcast_enabled: boolean;
  opening_broadcast_include_open_button: boolean;
  opening_broadcast_message_text: string;
  status: AudienceVoteStatus;
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

export type AudienceVoteScheduleConflictReason =
  | "open_ended_vote"
  | "overlap";

export interface AudienceVoteScheduleConflict {
  conflictingVote: AudienceVote;
  message: string;
  reason: AudienceVoteScheduleConflictReason;
}

export function getOpenEndedVoteScheduleNotice({
  currentVoteId,
  votes,
}: {
  currentVoteId?: string | undefined;
  votes: AudienceVote[];
}): string | null {
  const openEndedVote = votes.find(isOpenEndedVote);

  if (!openEndedVote) {
    return null;
  }

  if (openEndedVote.id === currentVoteId) {
    return "Це голосування відкрите без часу завершення. Додайте завершення, щоб наступні голосування можна було планувати без перетину.";
  }

  return `Відкрите голосування "${openEndedVote.title}" не має часу завершення, тому нові старти зараз недоступні. Закрийте його або додайте час завершення.`;
}

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
    opening_broadcast_enabled: vote.opening_broadcast_message_text !== null,
    opening_broadcast_include_open_button:
      vote.opening_broadcast_include_open_button,
    opening_broadcast_message_text: vote.opening_broadcast_message_text ?? "",
    status: vote.status,
    window_end: formatDateTimeLocalInput(vote.window_end),
    window_start: formatDateTimeLocalInput(vote.window_start),
  };
}

export function parseAudienceVoteScheduleDraft(
  draft: AudienceVoteScheduleDraft
): ParseAudienceVoteScheduleDraftResult {
  const parsed = patchAudienceVoteScheduleClientSchema.safeParse({
    opening_broadcast: draft.opening_broadcast_enabled
      ? {
          include_open_button: draft.opening_broadcast_include_open_button,
          message_text: draft.opening_broadcast_message_text,
        }
      : null,
    status: draft.status,
    window_end: draft.window_end,
    window_start: draft.window_start,
  });

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
      const scheduleField = mapAudienceVoteScheduleFieldName(fieldName);

      if (message && scheduleField) {
        acc[scheduleField] = message;
      }

      return acc;
    },
    {}
  );
}

export function findAudienceVoteScheduleConflict({
  excludeVoteId,
  now = new Date(),
  schedule,
  votes,
}: {
  excludeVoteId?: string | undefined;
  now?: Date;
  schedule: {
    status: AudienceVoteStatus;
    window_end: Date | null;
    window_start: Date | null;
  };
  votes: AudienceVote[];
}): AudienceVoteScheduleConflict | null {
  const scheduleWindow = getReservedWindow(schedule, now);

  if (!scheduleWindow) {
    return null;
  }

  const conflictingVote = votes.find((vote) => {
    if (vote.id === excludeVoteId || vote.archived || vote.status === "closed") {
      return false;
    }

    const voteWindow = getReservedWindow(vote, now);

    return voteWindow
      ? doTimeWindowsOverlap(scheduleWindow, voteWindow)
      : false;
  });

  if (!conflictingVote) {
    return null;
  }

  const reason = getAudienceVoteScheduleConflictReason(conflictingVote);

  return {
    conflictingVote,
    message: formatAudienceVoteScheduleConflictMessage(
      conflictingVote,
      reason
    ),
    reason,
  };
}

export function mapAudienceVoteScheduleConflictToFieldErrors(
  conflict: AudienceVoteScheduleConflict
): AudienceVoteScheduleFieldErrors {
  if (conflict.reason === "open_ended_vote") {
    return {
      window_start: conflict.message,
    };
  }

  return {
    window_end: conflict.message,
    window_start: conflict.message,
  };
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
    const fieldName = mapAudienceVoteScheduleIssuePath(issue.path);

    if (fieldName) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function mapAudienceVoteScheduleIssuePath(
  path: (string | number)[]
): keyof AudienceVoteScheduleDraft | null {
  const fieldName = path[0];

  if (fieldName === "opening_broadcast") {
    return path[1] === "include_open_button"
      ? "opening_broadcast_include_open_button"
      : "opening_broadcast_message_text";
  }

  return typeof fieldName === "string"
    ? mapAudienceVoteScheduleFieldName(fieldName)
    : null;
}

function mapAudienceVoteScheduleFieldName(
  value: string
): keyof AudienceVoteScheduleDraft | null {
  if (isAudienceVoteScheduleField(value)) {
    return value;
  }

  if (
    value === "opening_broadcast" ||
    value === "opening_broadcast.message_text"
  ) {
    return "opening_broadcast_message_text";
  }

  if (value === "opening_broadcast.include_open_button") {
    return "opening_broadcast_include_open_button";
  }

  return null;
}

function isAudienceVoteScheduleField(
  value: string
): value is keyof AudienceVoteScheduleDraft {
  return (
    value === "opening_broadcast_enabled" ||
    value === "opening_broadcast_include_open_button" ||
    value === "opening_broadcast_message_text" ||
    value === "status" ||
    value === "window_end" ||
    value === "window_start"
  );
}

function getReservedWindow(
  schedule: {
    status: AudienceVoteStatus;
    window_end: Date | null;
    window_start: Date | null;
  },
  now: Date
): TimeWindow | null {
  if (schedule.status === "scheduled") {
    return schedule.window_start
      ? { end: schedule.window_end, start: schedule.window_start }
      : null;
  }

  if (schedule.status === "open") {
    return { end: schedule.window_end, start: schedule.window_start ?? now };
  }

  return null;
}

function formatAudienceVoteScheduleConflictMessage(
  vote: AudienceVote,
  reason: AudienceVoteScheduleConflictReason
): string {
  if (reason === "open_ended_vote") {
    return `Голосування "${vote.title}" не має часу завершення, тому його вікно вважається безстроковим. Новий старт не можна запланувати, доки його не закриють або не додадуть час завершення.`;
  }

  return `Обраний час перетинається з голосуванням "${vote.title}". Виберіть інший час.`;
}

function getAudienceVoteScheduleConflictReason(
  vote: AudienceVote
): AudienceVoteScheduleConflictReason {
  return vote.window_end ? "overlap" : "open_ended_vote";
}

function isOpenEndedVote(vote: AudienceVote): boolean {
  return !vote.archived && vote.status === "open" && !vote.window_end;
}
