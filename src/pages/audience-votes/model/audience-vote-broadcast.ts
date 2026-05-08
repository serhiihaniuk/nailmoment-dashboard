import { z } from "zod";

import type {
  AudienceVote,
  AudienceVoteBroadcast,
  AudienceVoteBroadcastStatus,
} from "@/entities/audience-vote";
import {
  createAudienceVoteBroadcastClientSchema,
  type CreateAudienceVoteBroadcastClientOutput,
} from "@/shared/db/schema.zod";
import { formatAudienceVoteDate } from "./audience-vote-form";

export type CreateAudienceVoteBroadcastFormDraft = {
  audience_vote_id: string;
  include_open_button: boolean;
  message_text: string;
};

export type CreateAudienceVoteBroadcastFormValues =
  CreateAudienceVoteBroadcastClientOutput;

export type CreateAudienceVoteBroadcastFieldErrors = Partial<
  Record<keyof CreateAudienceVoteBroadcastFormDraft, string>
>;

export type AudienceVoteBroadcastApiError = {
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

type ParseBroadcastDraftResult =
  | { data: CreateAudienceVoteBroadcastFormValues; ok: true }
  | { errors: CreateAudienceVoteBroadcastFieldErrors; ok: false };

const audienceVoteBroadcastApiErrorSchema = z.object({
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

const broadcastStatusLabels: Record<AudienceVoteBroadcastStatus, string> = {
  canary_operator_pending: "Operator canary pending",
  canary_operator_sent: "Operator canary sent",
  canary_voters_sent: "Voter canary sent",
  completed: "Completed",
  failed: "Failed",
  interrupted: "Interrupted",
  ready: "Delivering",
};

export function createAudienceVoteBroadcastDefaultDraft(
  votes: AudienceVote[]
): CreateAudienceVoteBroadcastFormDraft {
  const preferredVote =
    votes.find((vote) => vote.status === "open") ??
    votes.find((vote) => vote.status === "scheduled") ??
    votes[0];

  return {
    audience_vote_id: preferredVote?.id ?? "",
    include_open_button: true,
    message_text: "",
  };
}

export function parseAudienceVoteBroadcastDraft(
  draft: CreateAudienceVoteBroadcastFormDraft
): ParseBroadcastDraftResult {
  const parsed = createAudienceVoteBroadcastClientSchema.safeParse(draft);

  if (parsed.success) {
    return { data: parsed.data, ok: true };
  }

  return {
    errors: mapAudienceVoteBroadcastIssues(parsed.error.issues),
    ok: false,
  };
}

export function parseAudienceVoteBroadcastApiError(
  value: unknown
): AudienceVoteBroadcastApiError {
  const parsed = audienceVoteBroadcastApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Could not update Audience Vote Broadcast." };
}

export function mapAudienceVoteBroadcastApiErrors(
  error: AudienceVoteBroadcastApiError
): CreateAudienceVoteBroadcastFieldErrors {
  if (!error.errors) {
    return {};
  }

  return Object.entries(error.errors).reduce<CreateAudienceVoteBroadcastFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message && isAudienceVoteBroadcastField(fieldName)) {
        acc[fieldName] = message;
      }

      return acc;
    },
    {}
  );
}

export function formatAudienceVoteBroadcastStatus(
  status: AudienceVoteBroadcastStatus
) {
  return broadcastStatusLabels[status];
}

export function formatAudienceVoteBroadcastNextStep(
  broadcast: AudienceVoteBroadcast,
  now = new Date()
) {
  if (broadcast.status === "canary_operator_pending") {
    return "Sending Operator canary now";
  }

  if (broadcast.status === "canary_operator_sent") {
    return broadcast.next_stage_at <= now
      ? "Sending 25-voter canary now"
      : `25-voter canary after ${formatAudienceVoteDate(broadcast.next_stage_at)}`;
  }

  if (broadcast.status === "canary_voters_sent") {
    return broadcast.next_stage_at <= now
      ? "Ready for normal delivery now"
      : `Normal delivery after ${formatAudienceVoteDate(broadcast.next_stage_at)}`;
  }

  if (broadcast.status === "ready") {
    return broadcast.delivery_counts.normal.pending > 0
      ? "Normal delivery in progress"
      : "Normal delivery finishing";
  }

  if (broadcast.status === "completed") {
    return "Delivery complete";
  }

  if (broadcast.status === "interrupted") {
    return "Stopped by Operator";
  }

  return "Canary failed";
}

export function isAudienceVoteBroadcastCanaryActive(
  status: AudienceVoteBroadcastStatus
) {
  return (
    status === "canary_operator_pending" ||
    status === "canary_operator_sent" ||
    status === "canary_voters_sent"
  );
}

export function isAudienceVoteBroadcastInterruptible(
  status: AudienceVoteBroadcastStatus
) {
  return isAudienceVoteBroadcastCanaryActive(status) || status === "ready";
}

export function isAudienceVoteBroadcastDue(
  broadcast: AudienceVoteBroadcast,
  now = new Date()
) {
  return (
    (isAudienceVoteBroadcastCanaryActive(broadcast.status) &&
      broadcast.next_stage_at <= now) ||
    (broadcast.status === "ready" &&
      broadcast.delivery_counts.normal.pending > 0)
  );
}

function mapAudienceVoteBroadcastIssues(
  issues: z.ZodIssue[]
): CreateAudienceVoteBroadcastFieldErrors {
  return issues.reduce<CreateAudienceVoteBroadcastFieldErrors>((acc, issue) => {
    const fieldName = issue.path[0];

    if (
      typeof fieldName === "string" &&
      isAudienceVoteBroadcastField(fieldName)
    ) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function isAudienceVoteBroadcastField(
  value: string
): value is keyof CreateAudienceVoteBroadcastFormDraft {
  return (
    value === "audience_vote_id" ||
    value === "include_open_button" ||
    value === "message_text"
  );
}
