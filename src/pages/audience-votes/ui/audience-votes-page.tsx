"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Smartphone, Vote } from "lucide-react";

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
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { fetchAudienceVotes } from "../api/audience-votes-client";
import { audienceVotesQueryKey } from "../model/use-create-audience-vote-dialog";
import { AudienceVoteBroadcastDialog } from "./audience-vote-broadcast-dialog";
import { CreateAudienceVoteDialog } from "./create-audience-vote-dialog";
import { AudienceVoteBroadcastsPanel } from "./audience-vote-broadcasts-panel";
import { AudienceVoteBotSettingsDialog } from "./audience-vote-bot-settings-panel";
import { AudienceVoteUpdateScreenDialog } from "./audience-vote-update-screen-panel";
import { VoteCard } from "./vote-card";

type StatusFilter = "all" | AudienceVoteStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Усі" },
  { value: "open", label: "Відкриті" },
  { value: "scheduled", label: "Заплановані" },
  { value: "draft", label: "Чернетки" },
  { value: "closed", label: "Закриті" },
];

export default function AudienceVotesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const {
    data: votes,
    error,
    isError,
    isFetching,
    isLoading,
  } = useQuery<AudienceVote[], Error>({
    queryKey: audienceVotesQueryKey,
    queryFn: fetchAudienceVotes,
    refetchInterval: 10_000,
    staleTime: 10_000,
  });

  const stats = useMemo(() => buildVoteStats(votes ?? []), [votes]);

  const filteredVotes = useMemo(() => {
    if (!votes) return [];
    if (statusFilter === "all") return votes;
    return votes.filter((v) => v.status === statusFilter);
  }, [votes, statusFilter]);

  // Sort: open first, then scheduled, then draft, then closed
  const sortedVotes = useMemo(() => {
    const statusOrder: Record<AudienceVoteStatus, number> = {
      open: 0,
      scheduled: 1,
      draft: 2,
      closed: 3,
    };
    return [...filteredVotes].sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    );
  }, [filteredVotes]);

  return (
    <div className="page-container flex flex-col gap-5 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-1">Голосування аудиторії</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Етапи голосування в Mini App, розсилки та резервний текст для
            виборців.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/audience-vote?preview=1" rel="noreferrer" target="_blank">
              <Smartphone aria-hidden="true" />
              Перегляд Mini App
            </Link>
          </Button>
          <AudienceVoteBotSettingsDialog />
          <AudienceVoteUpdateScreenDialog />
          <AudienceVoteBroadcastDialog votes={votes ?? []} />
          <CreateAudienceVoteDialog votes={votes ?? []} />
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} isRefreshing={isFetching && !isLoading} />

      {/* Error state */}
      {isError ? (
        <Alert variant="destructive">
          <FileText aria-hidden="true" />
          <AlertTitle>Не вдалося завантажити голосування</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : null}

      {/* Main content */}
      {!isLoading && votes ? (
        <>
          {/* Status filter tabs */}
          <StatusFilterSegment value={statusFilter} onChange={setStatusFilter} stats={stats} />

          {/* Vote cards */}
          {sortedVotes.length === 0 ? (
            <Empty className="rounded-xl border border-border/60 bg-white shadow-surface">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Vote aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {statusFilter === "all"
                    ? "Ще немає голосувань"
                    : "Немає голосувань у цьому статусі"}
                </EmptyTitle>
                <EmptyDescription>
                  {statusFilter === "all"
                    ? "Створіть перше голосування за спікера або батл до старту події."
                    : "Спробуйте вибрати інший фільтр."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-4">
              {sortedVotes.map((vote) => (
                <VoteCard key={vote.id} vote={vote} votes={votes} />
              ))}
            </div>
          )}

          <AudienceVoteBroadcastsPanel votes={votes} />
        </>
      ) : null}
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
      <span>{stats.total} усього</span>
      {stats.open > 0 && (
        <>
          <span className="text-border">·</span>
          <span className="text-success font-medium">
            {stats.open} відкрито
          </span>
        </>
      )}
      {stats.scheduled > 0 && (
        <>
          <span className="text-border">·</span>
          <span>{stats.scheduled} заплановано</span>
        </>
      )}
      {stats.draft > 0 && (
        <>
          <span className="text-border">·</span>
          <span>{stats.draft} чернеток</span>
        </>
      )}
      {stats.closed > 0 && (
        <>
          <span className="text-border">·</span>
          <span>{stats.closed} закрито</span>
        </>
      )}
      {isRefreshing && (
        <>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" />
            Оновлення
          </span>
        </>
      )}
    </div>
  );
}

/* ── Status Filter Segment ── */

function StatusFilterSegment({
  value,
  onChange,
  stats,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  stats: ReturnType<typeof buildVoteStats>;
}) {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
      <div className="flex items-center h-9 rounded-lg border border-border/60 overflow-hidden bg-white w-fit min-w-max">
        {STATUS_FILTERS.map((opt) => {
          const count = opt.value === "all" ? stats.total : stats[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "h-full px-3 sm:px-4 text-[12px] font-medium transition-colors whitespace-nowrap",
                "border-r border-border/40 last:border-r-0",
                value === opt.value
                  ? "bg-muted/60 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {opt.label}
              {count > 0 && (
                <span className="ml-1 sm:ml-1.5 text-[10px] tabular-nums opacity-60">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
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
