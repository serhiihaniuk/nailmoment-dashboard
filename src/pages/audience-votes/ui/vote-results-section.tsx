"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, Trophy } from "lucide-react";

import type { AudienceVote, AudienceVoteResults } from "@/entities/audience-vote";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { fetchAudienceVoteResults } from "../api/audience-votes-client";
import { audienceVoteResultsQueryKey } from "../model/use-audience-vote-results-dialog";

interface VoteResultsSectionProps {
  vote: AudienceVote;
}

export function VoteResultsSection({ vote }: VoteResultsSectionProps) {
  const { data, isLoading, isFetching, isError, error } = useQuery<AudienceVoteResults, Error>({
    enabled: true,
    queryFn: () => fetchAudienceVoteResults(vote.id),
    queryKey: audienceVoteResultsQueryKey(vote.id),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-[12px] text-destructive">
        Could not load results: {error.message}
      </p>
    );
  }

  if (!data) return null;

  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tabular-nums">
            {data.total_votes}
          </span>
          <span className="text-[12px] text-muted-foreground">
            {data.total_votes === 1 ? "vote" : "votes"}
          </span>
        </div>
        {isRefreshing && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <RefreshCw size={10} className="animate-spin" />
            Updating
          </span>
        )}
      </div>

      {/* Results list */}
      {data.results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <BarChart3 size={20} className="opacity-50" />
          <span className="text-[12px]">No votes yet</span>
        </div>
      ) : (
        <div className="space-y-2">
          {data.results.map((result, index) => (
            <ResultRow
              key={result.candidate_id}
              rank={result.rank}
              displayName={result.display_name}
              votes={result.total_votes}
              percentage={result.percentage}
              isLeader={index === 0 && result.total_votes > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ResultRowProps {
  rank: number;
  displayName: string;
  votes: number;
  percentage: number;
  isLeader: boolean;
}

function ResultRow({ rank, displayName, votes, percentage, isLeader }: ResultRowProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "w-5 text-[11px] font-medium tabular-nums shrink-0",
            isLeader ? "text-warning" : "text-muted-foreground",
          )}
        >
          {isLeader && <Trophy size={12} className="inline -mt-0.5 mr-0.5" />}
          #{rank}
        </span>
        <span className="flex-1 text-[13px] font-medium truncate">
          {displayName}
        </span>
        <span className="text-[12px] font-medium tabular-nums shrink-0">
          {votes}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right shrink-0">
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}
