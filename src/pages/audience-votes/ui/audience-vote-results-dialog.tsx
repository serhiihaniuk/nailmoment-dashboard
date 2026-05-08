"use client";

import { BarChart3, RefreshCw } from "lucide-react";

import type {
  AudienceVote,
  AudienceVoteResults,
} from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Audience Vote Results</DialogTitle>
          <DialogDescription>
            {vote.title} / {formatAudienceVoteKind(vote.kind)} /{" "}
            {formatAudienceVoteStatus(vote.status)}
          </DialogDescription>
        </DialogHeader>

        {state.isLoading ? (
          <Skeleton className="h-72 w-full rounded-lg" />
        ) : null}

        {state.isError ? (
          <p className="text-sm font-medium text-destructive">
            Could not load results: {state.error.message}
          </p>
        ) : null}

        {state.data ? (
          <AudienceVoteResultsPanel
            isRefreshing={state.isFetching && !state.isLoading}
            results={state.data}
          />
        ) : null}
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-lg font-semibold tabular-nums">
            {results.total_votes} votes
          </span>
          <span className="text-sm text-muted-foreground">
            {results.results.length} candidates
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Last updated {formatAudienceVoteDate(results.generated_at)}</span>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1">
              <RefreshCw
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
              Refreshing
            </span>
          ) : null}
        </div>
      </div>

      {results.results.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No active Vote Candidates yet.</EmptyTitle>
            <EmptyDescription>
              Results will appear after active candidates receive votes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14">Rank</TableHead>
              <TableHead>Vote Candidate</TableHead>
              <TableHead className="text-right">Votes</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="w-48"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.results.map((result) => (
              <TableRow key={result.candidate_id}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {result.rank}
                </TableCell>
                <TableCell>
                  <div className="min-w-44">
                    <div className="font-medium">{result.display_name}</div>
                    {result.internal_name ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {result.internal_name}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {result.total_votes}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {result.percentage}%
                </TableCell>
                <TableCell>
                  <Progress value={result.percentage} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
