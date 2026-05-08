"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileText,
  Loader2,
  Vote,
} from "lucide-react";

import type { AudienceVote, AudienceVoteStatus } from "@/entities/audience-vote";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
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
import { AudienceVoteUpdateScreenPanel } from "./audience-vote-update-screen-panel";
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
    <div className="page-container flex flex-col gap-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-1">Audience Votes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mini App voting stages, broadcasts, and voter-facing fallback text.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AudienceVoteBroadcastDialog votes={votes ?? []} />
          <CreateAudienceVoteDialog />
        </div>
      </div>

      <AudienceVoteStatsCards
        isRefreshing={isFetching && !isLoading}
        stats={stats}
      />

      {isError ? (
        <Alert variant="destructive">
          <FileText aria-hidden="true" />
          <AlertTitle>Could not load audience votes</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <Skeleton className="h-96 w-full rounded-xl" /> : null}

      <AudienceVoteUpdateScreenPanel />

      <AudienceVoteBroadcastsPanel votes={votes ?? []} />

      {!isLoading && votes ? <AudienceVotesTable votes={votes} /> : null}
    </div>
  );
}

function AudienceVotesTable({ votes }: { votes: AudienceVote[] }) {
  return (
    <Card className="gap-0 overflow-hidden shadow-surface">
      <CardHeader className="border-b border-border/60">
        <CardTitle>Voting stages</CardTitle>
        <CardDescription>
          Draft, schedule, open, close, and review vote results.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {votes.length === 0 ? (
          <Empty className="border border-border/70 bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Vote aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No voting stages yet</EmptyTitle>
              <EmptyDescription>
                Create the first speaker or battle vote before the event starts.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="**:data-[slot=table-container]:rounded-lg">
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
        )}
      </CardContent>
    </Card>
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

function AudienceVoteStatsCards({
  isRefreshing,
  stats,
}: {
  isRefreshing: boolean;
  stats: ReturnType<typeof buildVoteStats>;
}) {
  const items = [
    {
      icon: Vote,
      label: "Total",
      value: stats.total,
    },
    {
      icon: FileText,
      label: "Draft",
      value: stats.draft,
    },
    {
      icon: CalendarClock,
      label: "Scheduled",
      value: stats.scheduled,
    },
    {
      icon: CircleDot,
      label: "Open",
      value: stats.open,
    },
    {
      icon: Archive,
      label: "Closed",
      value: stats.closed,
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(({ icon: Icon, label, value }) => (
        <Card className="gap-0 py-0 shadow-none" key={label}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {value}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ))}
      {isRefreshing ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground xl:col-span-5">
          <Loader2 aria-hidden="true" className="animate-spin" />
          <span>Refreshing dashboard data</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground xl:col-span-5">
          <CheckCircle2 aria-hidden="true" />
          <span>Dashboard data is current</span>
        </div>
      )}
    </div>
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
