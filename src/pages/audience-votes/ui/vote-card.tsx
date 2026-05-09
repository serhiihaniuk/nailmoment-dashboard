"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

import type {
  AudienceVote,
  AudienceVoteResults,
  AudienceVoteStatus,
} from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { cn } from "@/shared/lib/cn";
import {
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
  formatAudienceVoteDate,
  formatAudienceVoteWindow,
} from "../model/audience-vote-form";
import { fetchAudienceVoteResults } from "../api/audience-votes-client";
import { AudienceVoteCandidatesDialog } from "./audience-vote-candidates-dialog";
import { AudienceVoteResultsDialog } from "./audience-vote-results-dialog";
import { AudienceVoteLifecycleActions } from "./audience-vote-lifecycle-actions";
import { AudienceVoteScheduleDialog } from "./audience-vote-schedule-dialog";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

interface VoteCardProps {
  vote: AudienceVote;
}

export function VoteCard({ vote }: VoteCardProps) {
  const [expanded, setExpanded] = useState(vote.status === "open");

  return (
    <div className="rounded-xl border border-border/60 bg-white shadow-surface overflow-hidden">
      {/* Header - always visible */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Status + title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusDot status={vote.status} />
              <h3 className="text-[15px] font-semibold text-foreground">
                {vote.title}
              </h3>
              <Badge
                className="rounded-md text-[11px] px-2 py-0.5"
                variant={getStatusBadgeVariant(vote.status)}
              >
                {formatAudienceVoteStatus(vote.status)}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px] text-muted-foreground">
              <span>{formatAudienceVoteKind(vote.kind)}</span>
              <span className="text-border">·</span>
              <span>Створено {formatAudienceVoteDate(vote.created_at)}</span>
              <span className="text-border">·</span>
              <span>{formatAudienceVoteWindow(vote)}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <AudienceVoteLifecycleActions vote={vote} />
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <AudienceVoteScheduleDialog vote={vote} />
          <AudienceVoteCandidatesDialog vote={vote} />
          <AudienceVoteResultsDialog vote={vote} />
          
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 px-2 sm:px-3 h-8 rounded-md text-[12px] font-medium transition-colors",
              "border border-border/60 bg-white hover:bg-muted/50",
              expanded && "bg-muted/40"
            )}
          >
            <BarChart3 size={14} className="shrink-0" />
            <span className="hidden sm:inline">
              {expanded ? "Сховати перегляд" : "Швидкий перегляд"}
            </span>
            <span className="sm:hidden">
              {expanded ? "Сховати" : "Перегляд"}
            </span>
            {expanded ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
          </button>
        </div>
      </div>

      {/* Expandable results section */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-4 sm:px-5">
          <VoteResultsInline vote={vote} />
        </div>
      )}
    </div>
  );
}

function VoteResultsInline({ vote }: { vote: AudienceVote }) {
  const { data, isLoading, isError, error, isFetching } = useQuery<
    AudienceVoteResults,
    Error
  >({
    queryKey: ["audienceVoteResults", vote.id],
    queryFn: () => fetchAudienceVoteResults(vote.id),
    enabled: vote.status === "open" || vote.status === "closed",
    refetchInterval: vote.status === "open" ? 10_000 : false,
    staleTime: 5_000,
  });

  if (vote.status === "draft" || vote.status === "scheduled") {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        Результати з’являться після відкриття голосування.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-destructive py-4">
        Не вдалося завантажити результати: {error.message}
      </div>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        Голосів ще немає.
      </div>
    );
  }

  const topResults = data.results.slice(0, 5);
  const hasMore = data.results.length > 5;

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {data.total_votes} голосів загалом
        </span>
        <div className="flex items-center gap-2">
          <span>Оновлено {formatAudienceVoteDate(data.generated_at)}</span>
          {isFetching && !isLoading && (
            <RefreshCw size={12} className="animate-spin" />
          )}
        </div>
      </div>

      {/* Results bars */}
      <div className="space-y-2">
        {topResults.map((result) => (
          <div key={result.candidate_id} className="flex items-center gap-3">
            <span className="w-5 text-right text-[11px] tabular-nums text-muted-foreground font-medium">
              {result.rank}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[13px] font-medium truncate">
                  {result.display_name}
                </span>
                <span className="text-[12px] tabular-nums text-muted-foreground shrink-0">
                  {result.total_votes} ({result.percentage}%)
                </span>
              </div>
              <Progress value={result.percentage} className="h-2" />
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          +{data.results.length - 5} кандидатів ще
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: AudienceVoteStatus }) {
  return (
    <div
      className={cn(
        "w-2.5 h-2.5 rounded-full shrink-0",
        status === "open" && "bg-success animate-pulse",
        status === "scheduled" && "bg-warning",
        status === "draft" && "bg-muted-foreground/40",
        status === "closed" && "bg-destructive/60"
      )}
    />
  );
}

function getStatusBadgeVariant(status: AudienceVoteStatus): BadgeVariant {
  if (status === "open") return "success";
  if (status === "closed") return "destructive";
  if (status === "scheduled") return "secondary";
  return "outline";
}
