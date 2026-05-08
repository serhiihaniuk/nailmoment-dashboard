"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { fetchAudienceVotes } from "../api/audience-votes-client";
import { audienceVotesQueryKey } from "../model/use-create-audience-vote-dialog";
import { AudienceVoteBroadcastDialog } from "./audience-vote-broadcast-dialog";
import { CreateAudienceVoteDialog } from "./create-audience-vote-dialog";
import { VoteCard } from "./vote-card";
import { VoteDetailPanel } from "./vote-detail-panel";

type StatusFilter = "all" | AudienceVoteStatus;

export default function AudienceVotesPage() {
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [broadcastDialogVote, setBroadcastDialogVote] = useState<AudienceVote | null>(null);

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

  const filteredVotes = useMemo(() => {
    if (!votes) return [];
    if (statusFilter === "all") return votes;
    return votes.filter((v) => v.status === statusFilter);
  }, [votes, statusFilter]);

  const selectedVote = useMemo(() => {
    if (!votes || !selectedVoteId) return null;
    return votes.find((v) => v.id === selectedVoteId) ?? null;
  }, [votes, selectedVoteId]);

  const handleClosePanel = useCallback(() => setSelectedVoteId(null), []);
  const handleSelectVote = useCallback((id: string) => setSelectedVoteId(id), []);
  const handleSendBroadcast = useCallback((vote: AudienceVote) => {
    setBroadcastDialogVote(vote);
  }, []);

  return (
    <div className="page-container flex flex-col gap-5 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-1">Audience Votes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mini App voting stages, broadcasts, and voter-facing fallback text.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateAudienceVoteDialog />
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} isRefreshing={isFetching && !isLoading} />

      {/* Error state */}
      {isError ? (
        <Alert variant="destructive">
          <FileText aria-hidden="true" />
          <AlertTitle>Could not load audience votes</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {/* Loading state */}
      {isLoading ? <Skeleton className="h-96 w-full rounded-xl" /> : null}

      {/* Main content */}
      {!isLoading && votes ? (
        <div className="rounded-xl border border-border/60 bg-white shadow-surface overflow-hidden animate-in-fade">
          {/* Toolbar with filters */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border/40">
            <StatusFilterSegment value={statusFilter} onChange={setStatusFilter} />
          </div>

          {/* Vote list */}
          {filteredVotes.length === 0 ? (
            <Empty className="m-4 border border-border/70 bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Vote aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {statusFilter === "all"
                    ? "No voting stages yet"
                    : `No ${statusFilter} votes`}
                </EmptyTitle>
                <EmptyDescription>
                  {statusFilter === "all"
                    ? "Create the first speaker or battle vote before the event starts."
                    : "Try selecting a different filter."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div>
              {filteredVotes.map((vote) => (
                <VoteCard
                  key={vote.id}
                  vote={vote}
                  isSelected={selectedVoteId === vote.id}
                  onClick={() => handleSelectVote(vote.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Detail panel */}
      <VoteDetailPanel
        vote={selectedVote}
        onClose={handleClosePanel}
        onSendBroadcast={handleSendBroadcast}
      />

      {/* Broadcast dialog - triggered from panel */}
      <AudienceVoteBroadcastDialog
        votes={votes ?? []}
        preselectedVote={broadcastDialogVote}
        onOpenChange={(open) => {
          if (!open) setBroadcastDialogVote(null);
        }}
      />
    </div>
  );
}

/* ── Stats Bar ── */

interface StatsBarProps {
  stats: ReturnType<typeof buildVoteStats>;
  isRefreshing: boolean;
}

function StatsBar({ stats, isRefreshing }: StatsBarProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-muted-foreground">
      <span>{stats.total} total</span>
      <span className="text-border">|</span>
      <span className="text-success">{stats.open} open</span>
      <span className="text-border">|</span>
      <span>{stats.scheduled} scheduled</span>
      <span className="text-border">|</span>
      <span>{stats.draft} draft</span>
      <span className="text-border">|</span>
      <span>{stats.closed} closed</span>
      {isRefreshing && (
        <>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" />
            Refreshing
          </span>
        </>
      )}
    </div>
  );
}

/* ── Status Filter Segment ── */

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
];

function StatusFilterSegment({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  return (
    <div className="flex items-center h-8 rounded-md border border-border/60 overflow-hidden">
      {STATUS_FILTERS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-full px-3 text-[12px] transition-colors duration-150 whitespace-nowrap",
            value === opt.value
              ? "bg-[#f5f5f5] text-foreground font-medium"
              : "bg-transparent text-muted-foreground font-normal hover:text-foreground hover:bg-muted/40",
            opt.value !== "all" && "border-l border-border/60",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Helpers ── */

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
