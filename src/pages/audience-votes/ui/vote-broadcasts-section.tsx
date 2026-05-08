"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CircleStop, Loader2, Radio, Send, Clock } from "lucide-react";

import type {
  AudienceVote,
  AudienceVoteBroadcast,
  AudienceVoteBroadcastId,
  AudienceVoteBroadcastStatus,
} from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import {
  fetchAudienceVoteBroadcasts,
  interruptAudienceVoteBroadcast,
  type AudienceVoteBroadcastApiError,
} from "../api/audience-vote-broadcasts-client";
import { formatAudienceVoteDate } from "../model/audience-vote-form";
import {
  formatAudienceVoteBroadcastStatus,
  isAudienceVoteBroadcastInterruptible,
} from "../model/audience-vote-broadcast";
import { audienceVoteBroadcastsQueryKey } from "../model/use-audience-vote-broadcast-dialog";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

interface VoteBroadcastsSectionProps {
  vote: AudienceVote;
  onSendBroadcast: () => void;
}

export function VoteBroadcastsSection({ vote, onSendBroadcast }: VoteBroadcastsSectionProps) {
  const queryClient = useQueryClient();

  const { data: allBroadcasts, isLoading, isError, error } = useQuery<AudienceVoteBroadcast[], Error>({
    queryKey: audienceVoteBroadcastsQueryKey,
    queryFn: fetchAudienceVoteBroadcasts,
    refetchInterval: 10_000,
    staleTime: 5_000,
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

  // Filter broadcasts for this specific vote
  const broadcasts = useMemo(() => {
    if (!allBroadcasts) return [];
    return allBroadcasts.filter((b) => b.audience_vote_id === vote.id);
  }, [allBroadcasts, vote.id]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 text-destructive text-[12px]">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <span>Could not load broadcasts: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Send broadcast button */}
      {vote.status === "open" || vote.status === "scheduled" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onSendBroadcast}
          className="w-full"
        >
          <Send size={14} className="mr-1.5" />
          Send Broadcast
        </Button>
      ) : null}

      {/* Broadcasts list */}
      {broadcasts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Send size={20} className="opacity-50" />
          <span className="text-[12px]">No broadcasts yet</span>
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((broadcast) => (
            <BroadcastRow
              key={broadcast.id}
              broadcast={broadcast}
              interruptDisabled={interruptMutation.isPending}
              onInterrupt={() => interruptMutation.mutate(broadcast.id)}
            />
          ))}
        </div>
      )}

      {interruptMutation.error && (
        <p className="text-[11px] text-destructive">
          {interruptMutation.error.message}
        </p>
      )}
    </div>
  );
}

interface BroadcastRowProps {
  broadcast: AudienceVoteBroadcast;
  interruptDisabled: boolean;
  onInterrupt: () => void;
}

function BroadcastRow({ broadcast, interruptDisabled, onInterrupt }: BroadcastRowProps) {
  const totalSent =
    broadcast.delivery_counts.operator_canary.sent +
    broadcast.delivery_counts.voter_canary.sent +
    broadcast.delivery_counts.normal.sent;

  const isInterruptible = isAudienceVoteBroadcastInterruptible(broadcast.status);
  const isComplete = broadcast.status === "completed";
  const isFailed = broadcast.status === "failed" || broadcast.status === "interrupted";

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 p-3",
        isComplete && "bg-success/5 border-success/30",
        isFailed && "bg-destructive/5 border-destructive/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Status and date */}
          <div className="flex items-center gap-2">
            <Badge
              className="rounded-md text-[10px] px-1.5 py-0"
              variant={getBroadcastStatusBadgeVariant(broadcast.status)}
            >
              {formatAudienceVoteBroadcastStatus(broadcast.status)}
            </Badge>
            {broadcast.include_open_button && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Radio size={10} />
                App
              </span>
            )}
          </div>

          {/* Message preview */}
          <p className="mt-1.5 text-[12px] text-foreground line-clamp-2">
            {broadcast.message_text}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {isComplete ? (
                <Check size={11} className="text-success" />
              ) : (
                <Clock size={11} />
              )}
              {totalSent} sent
            </span>
            <span>{formatAudienceVoteDate(broadcast.created_at)}</span>
          </div>
        </div>

        {/* Interrupt button */}
        {isInterruptible && (
          <Button
            size="sm"
            variant="destructive"
            disabled={interruptDisabled}
            onClick={onInterrupt}
            className="shrink-0 h-7 px-2 text-[11px]"
          >
            {interruptDisabled ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CircleStop size={12} />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function getBroadcastStatusBadgeVariant(
  status: AudienceVoteBroadcastStatus
): BadgeVariant {
  if (status === "completed") return "success";
  if (status === "interrupted" || status === "failed") return "destructive";
  if (
    status === "canary_operator_sent" ||
    status === "canary_voters_sent" ||
    status === "ready"
  ) {
    return "secondary";
  }
  return "outline";
}
