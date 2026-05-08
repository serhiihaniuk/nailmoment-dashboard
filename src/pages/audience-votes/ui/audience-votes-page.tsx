"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AudienceVote, AudienceVoteStatus } from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { fetchAudienceVotes } from "../api/audience-votes-client";
import {
  formatAudienceVoteDate,
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
  formatAudienceVoteWindow,
} from "../model/audience-vote-form";
import { audienceVotesQueryKey } from "../model/use-create-audience-vote-dialog";
import { AudienceVoteBroadcastDialog } from "./audience-vote-broadcast-dialog";
import { AudienceVoteBroadcastsPanel } from "./audience-vote-broadcasts-panel";
import { AudienceVoteCandidatesDialog } from "./audience-vote-candidates-dialog";
import { AudienceVoteLifecycleActions } from "./audience-vote-lifecycle-actions";
import { AudienceVoteResultsDialog } from "./audience-vote-results-dialog";
import { CreateAudienceVoteDialog } from "./create-audience-vote-dialog";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

export default function AudienceVotesPage() {
  const {
    data: votes,
    error,
    isError,
    isFetching,
    isLoading,
  } = useQuery<AudienceVote[], Error>({
    queryKey: audienceVotesQueryKey,
    queryFn: fetchAudienceVotes,
    staleTime: 10_000,
  });

  const stats = useMemo(() => buildVoteStats(votes ?? []), [votes]);

  return (
    <div className="page-container flex flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-1">Audience Votes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Core setup for Mini App voting stages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AudienceVoteBroadcastDialog votes={votes ?? []} />
          <CreateAudienceVoteDialog />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{stats.total} total</span>
        <span className="text-border">/</span>
        <span>{stats.draft} draft</span>
        <span className="text-border">/</span>
        <span>{stats.scheduled} scheduled</span>
        <span className="text-border">/</span>
        <span>{stats.open} open</span>
        <span className="text-border">/</span>
        <span>{stats.closed} closed</span>
        {isFetching && !isLoading ? (
          <>
            <span className="text-border">/</span>
            <span>Refreshing...</span>
          </>
        ) : null}
      </div>

      {isError ? (
        <p className="font-medium text-destructive">
          Could not load audience votes: {error.message}
        </p>
      ) : null}

      {isLoading ? <Skeleton className="h-96 w-full rounded-xl" /> : null}

      <AudienceVoteBroadcastsPanel votes={votes ?? []} />

      {!isLoading && votes ? <AudienceVotesTable votes={votes} /> : null}
    </div>
  );
}

function AudienceVotesTable({ votes }: { votes: AudienceVote[] }) {
  if (votes.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-white p-10 text-center text-sm text-muted-foreground">
        No Audience Votes yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-white shadow-surface **:data-[slot=table-container]:rounded-none **:data-[slot=table-container]:border-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Title</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Planning window</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Candidates</TableHead>
            <TableHead className="text-right">Results</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {votes.map((vote) => (
            <TableRow key={vote.id}>
              <TableCell>
                <div className="min-w-48">
                  <div className="font-medium">{vote.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {vote.id}
                  </div>
                </div>
              </TableCell>
              <TableCell>{formatAudienceVoteKind(vote.kind)}</TableCell>
              <TableCell>
                <Badge
                  className="rounded-md"
                  variant={getStatusBadgeVariant(vote.status)}
                >
                  {formatAudienceVoteStatus(vote.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatAudienceVoteWindow(vote)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatAudienceVoteDate(vote.created_at)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatAudienceVoteDate(vote.updated_at)}
              </TableCell>
              <TableCell className="text-right">
                <AudienceVoteCandidatesDialog vote={vote} />
              </TableCell>
              <TableCell className="text-right">
                <AudienceVoteResultsDialog vote={vote} />
              </TableCell>
              <TableCell className="text-right">
                <AudienceVoteLifecycleActions vote={vote} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function buildVoteStats(votes: AudienceVote[]) {
  return votes.reduce(
    (acc, vote) => ({
      ...acc,
      [vote.status]: acc[vote.status] + 1,
      total: acc.total + 1,
    }),
    {
      closed: 0,
      draft: 0,
      open: 0,
      scheduled: 0,
      total: 0,
    } satisfies Record<AudienceVoteStatus, number> & { total: number }
  );
}

function getStatusBadgeVariant(status: AudienceVoteStatus): BadgeVariant {
  if (status === "open") {
    return "success";
  }

  if (status === "closed") {
    return "destructive";
  }

  if (status === "scheduled") {
    return "secondary";
  }

  return "outline";
}
