"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleStop, Loader2, Radio } from "lucide-react";

import type {
  AudienceVote,
  AudienceVoteBroadcast,
  AudienceVoteBroadcastId,
  AudienceVoteBroadcastStatus,
} from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  fetchAudienceVoteBroadcasts,
  interruptAudienceVoteBroadcast,
  processAudienceVoteBroadcastCanary,
  type AudienceVoteBroadcastApiError,
} from "../api/audience-vote-broadcasts-client";
import { formatAudienceVoteDate } from "../model/audience-vote-form";
import {
  formatAudienceVoteBroadcastNextStep,
  formatAudienceVoteBroadcastStatus,
  isAudienceVoteBroadcastCanaryActive,
  isAudienceVoteBroadcastDue,
} from "../model/audience-vote-broadcast";
import { audienceVoteBroadcastsQueryKey } from "../model/use-audience-vote-broadcast-dialog";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

export function AudienceVoteBroadcastsPanel({
  votes,
}: {
  votes: AudienceVote[];
}) {
  const queryClient = useQueryClient();
  const voteTitles = useMemo(
    () => new Map(votes.map((vote) => [vote.id, vote.title])),
    [votes]
  );
  const {
    data: broadcasts,
    error,
    isError,
    isLoading,
  } = useQuery<AudienceVoteBroadcast[], Error>({
    queryKey: audienceVoteBroadcastsQueryKey,
    queryFn: fetchAudienceVoteBroadcasts,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const processMutation = useMutation<
    AudienceVoteBroadcast,
    AudienceVoteBroadcastApiError,
    AudienceVoteBroadcastId
  >({
    mutationFn: processAudienceVoteBroadcastCanary,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteBroadcastsQueryKey,
      });
    },
  });

  const interruptMutation = useMutation<
    AudienceVoteBroadcast,
    AudienceVoteBroadcastApiError,
    AudienceVoteBroadcastId
  >({
    mutationFn: interruptAudienceVoteBroadcast,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteBroadcastsQueryKey,
      });
    },
  });

  const dueBroadcast = broadcasts?.find((broadcast) =>
    isAudienceVoteBroadcastDue(broadcast)
  );
  const processCanary = processMutation.mutate;
  const isProcessingCanary = processMutation.isPending;

  useEffect(() => {
    if (!dueBroadcast || isProcessingCanary) {
      return;
    }

    processCanary(dueBroadcast.id);
  }, [dueBroadcast, isProcessingCanary, processCanary]);

  const mutationError =
    processMutation.error?.message ?? interruptMutation.error?.message ?? null;

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-3">Broadcasts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirmation, canary status, and Operator interrupt.
          </p>
        </div>
        {isProcessingCanary ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="animate-spin" size={14} />
            Advancing canary
          </div>
        ) : null}
      </div>

      {isError ? (
        <p className="font-medium text-destructive">
          Could not load broadcasts: {error.message}
        </p>
      ) : null}

      {mutationError ? (
        <p className="font-medium text-destructive">{mutationError}</p>
      ) : null}

      {isLoading ? <Skeleton className="h-32 w-full rounded-lg" /> : null}

      {!isLoading && broadcasts && broadcasts.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-white p-6 text-sm text-muted-foreground">
          No Audience Vote Broadcasts yet.
        </div>
      ) : null}

      {!isLoading && broadcasts && broadcasts.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-white shadow-surface">
          {broadcasts.map((broadcast) => (
            <BroadcastRow
              broadcast={broadcast}
              interruptDisabled={interruptMutation.isPending}
              key={broadcast.id}
              onInterrupt={() => interruptMutation.mutate(broadcast.id)}
              voteTitle={voteTitles.get(broadcast.audience_vote_id) ?? "Vote"}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BroadcastRow({
  broadcast,
  interruptDisabled,
  onInterrupt,
  voteTitle,
}: {
  broadcast: AudienceVoteBroadcast;
  interruptDisabled: boolean;
  onInterrupt: () => void;
  voteTitle: string;
}) {
  const canarySent =
    broadcast.delivery_counts.operator_canary.sent +
    broadcast.delivery_counts.voter_canary.sent;
  const canaryFailed =
    broadcast.delivery_counts.operator_canary.failed +
    broadcast.delivery_counts.voter_canary.failed;

  return (
    <div className="grid gap-3 border-b border-border/60 p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_18rem_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="rounded-md"
            variant={getBroadcastStatusBadgeVariant(broadcast.status)}
          >
            {formatAudienceVoteBroadcastStatus(broadcast.status)}
          </Badge>
          <span className="text-sm font-medium">{voteTitle}</span>
          {broadcast.include_open_button ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Radio aria-hidden="true" size={12} />
              Mini App button
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-sm text-foreground">
          {broadcast.message_text}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Created {formatAudienceVoteDate(broadcast.created_at)}
        </p>
      </div>

      <div className="grid gap-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">
            {broadcast.estimated_recipient_count}
          </span>{" "}
          active voters targeted
        </p>
        <p>
          Canary sent {canarySent}
          {canaryFailed > 0 ? ` / failed ${canaryFailed}` : ""}
        </p>
        <p>Normal pending {broadcast.delivery_counts.normal.pending}</p>
        <p>{formatAudienceVoteBroadcastNextStep(broadcast)}</p>
      </div>

      <div className="flex justify-start lg:justify-end">
        {isAudienceVoteBroadcastCanaryActive(broadcast.status) ? (
          <Button
            disabled={interruptDisabled}
            onClick={onInterrupt}
            size="sm"
            variant="destructive"
          >
            <CircleStop aria-hidden="true" data-icon="inline-start" />
            Interrupt
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function getBroadcastStatusBadgeVariant(
  status: AudienceVoteBroadcastStatus
): BadgeVariant {
  if (status === "ready") {
    return "success";
  }

  if (status === "interrupted" || status === "failed") {
    return "destructive";
  }

  if (status === "canary_operator_sent" || status === "canary_voters_sent") {
    return "secondary";
  }

  return "outline";
}
