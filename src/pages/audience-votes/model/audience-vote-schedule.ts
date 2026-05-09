import { z } from "zod";

import type { AudienceVote, AudienceVoteStatus } from "@/entities/audience-vote";
import { doTimeWindowsOverlap, type TimeWindow } from "@/shared/lib/time-window";
import {
  patchAudienceVoteScheduleClientSchema,
  type PatchAudienceVoteScheduleClientOutput,
} from "@/shared/db/schema.zod";

export type AudienceVoteScheduleDraft = {
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
    status: vote.status,
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
