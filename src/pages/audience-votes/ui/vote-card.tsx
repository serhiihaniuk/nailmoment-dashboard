"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import type {
  AudienceVote,
  AudienceVoteResults,
  AudienceVoteStatus,
} from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import { fetchAudienceVoteResults } from "../api/audience-votes-client";
import {
  formatAudienceVoteDate,
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
  formatAudienceVoteWindow,
} from "../model/audience-vote-form";
import { AudienceVoteCandidatesDialog } from "./audience-vote-candidates-dialog";
import { AudienceVoteLifecycleActions } from "./audience-vote-lifecycle-actions";
import { AudienceVoteResultsDrawer } from "./audience-vote-results-drawer";
import { AudienceVoteScheduleDialog } from "./audience-vote-schedule-dialog";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

interface VoteCardProps {
  vote: AudienceVote;
  votes: AudienceVote[];
}

export function VoteCard({ vote, votes }: VoteCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-surface">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusDot status={vote.status} />
              <h3 className="min-w-0 truncate text-[15px] font-semibold text-foreground">
                {vote.title}
              </h3>
              <Badge
                className="rounded-md px-2 py-0.5 text-[11px]"
                variant={getStatusBadgeVariant(vote.status)}
              >
                {formatAudienceVoteStatus(vote.status)}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
              <span>{formatAudienceVoteKind(vote.kind)}</span>
              <span className="text-border">·</span>
              <span>Створено {formatAudienceVoteDate(vote.created_at)}</span>
              <span className="text-border">·</span>
              <span>{formatAudienceVoteWindow(vote)}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AudienceVoteLifecycleActions vote={vote} />
          </div>
        </div>

        <VoteResultSummary vote={vote} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AudienceVoteScheduleDialog vote={vote} votes={votes} />
          <AudienceVoteCandidatesDialog vote={vote} />
          <AudienceVoteResultsDrawer vote={vote} />
        </div>
      </div>
    </article>
  );
}

function VoteResultSummary({ vote }: { vote: AudienceVote }) {
  const resultsEnabled = vote.status === "open" || vote.status === "closed";
  const { data, isError, isFetching, isLoading } = useQuery<
    AudienceVoteResults,
    Error
  >({
    enabled: resultsEnabled,
    queryFn: () => fetchAudienceVoteResults(vote.id),
    queryKey: ["audienceVoteResults", vote.id],
    refetchInterval: vote.status === "open" ? 10_000 : false,
    staleTime: 5_000,
  });

  if (!resultsEnabled) {
    return (
      <div className="mt-4 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-2">
        <SummaryBlock label="Лідер" value="Ще немає" />
        <SummaryBlock
          label="Голоси"
          value="Результати з’являться після відкриття"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Завантаження результатів
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mt-4 border-t border-border/50 pt-4 text-sm text-destructive">
        Не вдалося завантажити короткий підсумок.
      </div>
    );
  }

  const leader = data.results.find((result) => result.total_votes > 0) ?? null;

  return (
    <div className="mt-4 grid gap-3 border-t border-border/50 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <SummaryBlock
        label="Лідер"
        value={leader?.display_name ?? "Немає голосів"}
      />
      <SummaryBlock
        detail={
          <span className="inline-flex items-center gap-1.5">
            Оновлено {formatAudienceVoteDate(data.generated_at)}
            {isFetching && !isLoading ? (
              <RefreshCw aria-hidden="true" className="size-3 animate-spin" />
            ) : null}
          </span>
        }
        label="Голоси"
        value={`${formatVoteCount(data.total_votes)} · ${
          data.results.length
        } кандидатів`}
      />
    </div>
  );
}

function SummaryBlock({
  detail,
  label,
  value,
}: {
  detail?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

function StatusDot({ status }: { status: AudienceVoteStatus }) {
  return (
    <div
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        status === "open" && "animate-pulse bg-success",
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

function formatVoteCount(count: number) {
  if (count === 1) return "1 голос";
  if (count > 1 && count < 5) return `${count} голоси`;
  return `${count} голосів`;
}
