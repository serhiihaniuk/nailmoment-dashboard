"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CircleStop, Loader2, Radio, Send } from "lucide-react";

import type {
  AudienceVote,
  AudienceVoteBroadcast,
  AudienceVoteBroadcastId,
  AudienceVoteBroadcastStatus,
} from "@/entities/audience-vote";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  fetchAudienceVoteBroadcasts,
  interruptAudienceVoteBroadcast,
  processAudienceVoteBroadcast,
  type AudienceVoteBroadcastApiError,
} from "../api/audience-vote-broadcasts-client";
import { formatAudienceVoteDate } from "../model/audience-vote-form";
import {
  formatAudienceVoteBroadcastNextStep,
  formatAudienceVoteBroadcastStatus,
  isAudienceVoteBroadcastDue,
  isAudienceVoteBroadcastInterruptible,
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
    mutationFn: processAudienceVoteBroadcast,
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
  const processBroadcast = processMutation.mutate;
  const isProcessingBroadcast = processMutation.isPending;

  useEffect(() => {
    if (!dueBroadcast || isProcessingBroadcast) {
      return;
    }

    processBroadcast(dueBroadcast.id);
  }, [dueBroadcast, isProcessingBroadcast, processBroadcast]);

  const mutationError =
    processMutation.error?.message ?? interruptMutation.error?.message ?? null;

  return (
    <section>
      <Card className="gap-0 overflow-hidden shadow-surface">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Broadcasts</CardTitle>
          <CardDescription>
            Canary checks, delivery progress, and Operator interrupt.
          </CardDescription>
        {isProcessingBroadcast ? (
          <CardAction className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="animate-spin" />
            <span>Processing</span>
          </CardAction>
        ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4">
          {isError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Could not load broadcasts</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          {mutationError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Broadcast action failed</AlertTitle>
              <AlertDescription>{mutationError}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? <Skeleton className="h-36 w-full rounded-lg" /> : null}

          {!isLoading && broadcasts && broadcasts.length === 0 ? (
            <Empty className="border border-border/70 bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Send aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No broadcasts yet</EmptyTitle>
                <EmptyDescription>
                  Create one when voters need a Telegram reminder.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!isLoading && broadcasts && broadcasts.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border/70">
              {broadcasts.map((broadcast) => (
                <BroadcastRow
                  broadcast={broadcast}
                  interruptDisabled={interruptMutation.isPending}
                  key={broadcast.id}
                  onInterrupt={() => interruptMutation.mutate(broadcast.id)}
                  voteTitle={
                    voteTitles.get(broadcast.audience_vote_id) ?? "Vote"
                  }
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
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
        <p>
          Normal sent {broadcast.delivery_counts.normal.sent} / pending{" "}
          {broadcast.delivery_counts.normal.pending}
          {broadcast.delivery_counts.normal.failed > 0
            ? ` / failed ${broadcast.delivery_counts.normal.failed}`
            : ""}
        </p>
        <p>{formatAudienceVoteBroadcastNextStep(broadcast)}</p>
      </div>

      <div className="flex justify-start lg:justify-end">
        {isAudienceVoteBroadcastInterruptible(broadcast.status) ? (
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
  if (status === "completed") {
    return "success";
  }

  if (status === "interrupted" || status === "failed") {
    return "destructive";
  }

  if (
    status === "canary_operator_sent" ||
    status === "canary_voters_sent" ||
    status === "ready"
  ) {
    return "secondary";
  }

  return "outline";
}
