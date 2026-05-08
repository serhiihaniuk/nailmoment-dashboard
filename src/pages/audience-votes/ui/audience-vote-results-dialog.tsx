"use client";

import { BarChart3, RefreshCw, Trophy, Medal } from "lucide-react";

import type {
  AudienceVote,
  AudienceVoteResults,
} from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import {
  formatAudienceVoteDate,
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
} from "../model/audience-vote-form";
import { useAudienceVoteResultsDialog } from "../model/use-audience-vote-results-dialog";

export function AudienceVoteResultsDialog({ vote }: { vote: AudienceVote }) {
  const state = useAudienceVoteResultsDialog(vote);

  return (
    <Dialog open={state.open} onOpenChange={state.handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <BarChart3 aria-hidden="true" data-icon="inline-start" />
          Results
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[85vw] sm:max-w-4xl lg:max-w-5xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-muted/30">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                Voting Results
              </DialogTitle>
              <DialogDescription className="mt-1 sm:mt-1.5 flex items-center gap-1.5 sm:gap-2 flex-wrap text-[12px] sm:text-sm">
                <span className="font-medium text-foreground truncate">{vote.title}</span>
                <span className="text-border hidden sm:inline">·</span>
                <span className="hidden sm:inline">{formatAudienceVoteKind(vote.kind)}</span>
                <Badge 
                  variant={vote.status === "open" ? "default" : vote.status === "closed" ? "destructive" : "secondary"}
                  className="rounded-md text-[10px] px-1.5"
                >
                  {formatAudienceVoteStatus(vote.status)}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {state.isLoading ? (
            <Skeleton className="h-72 w-full rounded-lg" />
          ) : null}

          {state.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Could not load results: {state.error.message}
            </div>
          ) : null}

          {state.data ? (
            <AudienceVoteResultsPanel
              isRefreshing={state.isFetching && !state.isLoading}
              results={state.data}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AudienceVoteResultsPanel({
  isRefreshing,
  results,
}: {
  isRefreshing: boolean;
  results: AudienceVoteResults;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-muted/40 border border-border/40">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {results.total_votes}
          </span>
          <span className="text-sm text-muted-foreground">total votes</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-md">
            {results.results.length} candidates
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Updated {formatAudienceVoteDate(results.generated_at)}</span>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <RefreshCw
                aria-hidden="true"
                className="animate-spin w-3 h-3"
              />
              Refreshing
            </span>
          ) : null}
        </div>
      </div>

      {results.results.length === 0 ? (
        <Empty className="border border-border/50 rounded-lg py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No votes recorded yet</EmptyTitle>
            <EmptyDescription>
              Results will appear after active candidates receive votes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {results.results.map((result, index) => (
            <div 
              key={result.candidate_id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                index === 0 && "bg-amber-50/50 border-amber-200/70",
                index === 1 && "bg-slate-50/50 border-slate-200/70",
                index === 2 && "bg-orange-50/30 border-orange-200/50",
                index > 2 && "bg-white border-border/50 hover:bg-muted/30"
              )}
            >
              {/* Rank badge */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                index === 0 && "bg-amber-100 text-amber-700",
                index === 1 && "bg-slate-200 text-slate-700",
                index === 2 && "bg-orange-100 text-orange-700",
                index > 2 && "bg-muted text-muted-foreground"
              )}>
                {index < 3 ? (
                  index === 0 ? (
                    <Trophy className="w-5 h-5" />
                  ) : (
                    <Medal className="w-5 h-5" />
                  )
                ) : (
                  <span className="text-sm font-bold tabular-nums">{result.rank}</span>
                )}
              </div>

              {/* Candidate info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "font-semibold truncate",
                    index === 0 && "text-amber-900",
                    index === 1 && "text-slate-800",
                    index === 2 && "text-orange-800"
                  )}>
                    {result.display_name}
                  </span>
                  {result.internal_name && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      ({result.internal_name})
                    </span>
                  )}
                </div>
                <Progress 
                  value={result.percentage} 
                  className={cn(
                    "h-2",
                    index === 0 && "[&>[data-slot=indicator]]:bg-amber-500",
                    index === 1 && "[&>[data-slot=indicator]]:bg-slate-500",
                    index === 2 && "[&>[data-slot=indicator]]:bg-orange-500"
                  )}
                />
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <div className="font-bold tabular-nums text-lg">
                  {result.total_votes}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {result.percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
