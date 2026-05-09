"use client";

import { BarChart3, RefreshCw, X } from "lucide-react";

import type {
  AudienceVote,
  AudienceVoteResultItem,
  AudienceVoteResults,
} from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";
import { Skeleton } from "@/shared/ui/skeleton";
import { SlidePanel } from "@/shared/ui/slide-panel";
import { cn } from "@/shared/lib/cn";
import {
  formatAudienceVoteDate,
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
} from "../model/audience-vote-form";
import { useAudienceVoteResultsDrawer } from "../model/use-audience-vote-results-drawer";

export function AudienceVoteResultsDrawer({ vote }: { vote: AudienceVote }) {
  const state = useAudienceVoteResultsDrawer(vote);

  return (
    <>
      <Button
        onClick={() => state.handleOpenChange(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <BarChart3 aria-hidden="true" data-icon="inline-start" />
        Результати
      </Button>

      <SlidePanel
        className="sm:w-135 md:w-155"
        footer={
          <div className="flex justify-end">
            <Button
              onClick={() => state.handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Закрити
            </Button>
          </div>
        }
        onClose={() => state.handleOpenChange(false)}
        open={state.open}
        showCloseButton={false}
      >
        <div className="space-y-5">
          <header className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
                Результати голосування
              </p>
              <h2 className="mt-2 truncate text-xl font-semibold text-foreground">
                {vote.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{formatAudienceVoteKind(vote.kind)}</span>
                <span className="text-border">·</span>
                <Badge
                  className="rounded-md"
                  variant={vote.status === "open" ? "success" : "secondary"}
                >
                  {formatAudienceVoteStatus(vote.status)}
                </Badge>
              </div>
            </div>
            <Button
              aria-label="Закрити результати"
              onClick={() => state.handleOpenChange(false)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          </header>

          {state.isLoading ? <ResultsSkeleton /> : null}

          {state.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Не вдалося завантажити результати: {state.error.message}
            </div>
          ) : null}

          {state.data ? (
            <AudienceVoteResultsPanel
              isRefreshing={state.isFetching && !state.isLoading}
              results={state.data}
            />
          ) : null}
        </div>
      </SlidePanel>
    </>
  );
}

function AudienceVoteResultsPanel({
  isRefreshing,
  results,
}: {
  isRefreshing: boolean;
  results: AudienceVoteResults;
}) {
  const leader = results.results[0] ?? null;
  const runnerUp = results.results[1] ?? null;
  const winnerMargin = leader
    ? leader.total_votes - (runnerUp?.total_votes ?? 0)
    : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Голосів"
          value={results.total_votes.toString()}
          detail={formatVoteCount(results.total_votes)}
        />
        <ResultStat
          label="Кандидатів"
          value={results.results.length.toString()}
          detail="у цьому голосуванні"
        />
        <ResultStat
          label="Лідер"
          value={leader?.display_name ?? "Немає"}
          detail={
            leader
              ? `${leader.total_votes} голосів · ${leader.percentage}%`
              : "ще без голосів"
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Оновлено {formatAudienceVoteDate(results.generated_at)}</span>
        {isRefreshing ? (
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <RefreshCw aria-hidden="true" className="size-3 animate-spin" />
            Оновлення
          </span>
        ) : null}
      </div>

      {results.results.length === 0 ? (
        <Empty className="rounded-lg border border-border/60 bg-white py-12 shadow-xs">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Голосів ще немає</EmptyTitle>
            <EmptyDescription>
              Результати з’являться після першого збереженого голосу.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <section className="rounded-xl border border-border/60 bg-white shadow-xs">
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Розподіл голосів
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Компактний рейтинг усіх кандидатів.
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {results.results.map((result, index) => (
              <VotingCandidateRow
                isLeader={index === 0 && result.total_votes > 0}
                key={result.candidate_id}
                result={result}
              />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border/60 bg-white p-4 shadow-xs">
        <h3 className="text-sm font-semibold text-foreground">
          Короткі висновки
        </h3>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Insight label="Відрив лідера" value={formatVoteCount(winnerMargin)} />
          <Insight
            label="Активність"
            value={getParticipationLabel(results.total_votes)}
          />
        </div>
      </section>
    </div>
  );
}

function VotingCandidateRow({
  isLeader,
  result,
}: {
  isLeader: boolean;
  result: AudienceVoteResultItem;
}) {
  const percentage = Math.max(0, Math.min(result.percentage, 100));

  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_4rem]",
        isLeader ? "bg-success/5" : "bg-white"
      )}
    >
      <div className="pt-0.5 text-right text-sm font-medium tabular-nums text-muted-foreground">
        {result.rank}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {result.display_name}
          </p>
          {isLeader ? (
            <Badge className="rounded-md px-1.5 py-0 text-[10px]" variant="success">
              Лідер
            </Badge>
          ) : null}
        </div>
        {result.internal_name ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {result.internal_name}
          </p>
        ) : null}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              result.total_votes === 0
                ? "bg-muted-foreground/20"
                : isLeader
                  ? "bg-success"
                  : "bg-foreground/70"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="col-start-2 flex items-center gap-4 text-sm tabular-nums sm:col-start-auto sm:block sm:text-right">
        <span className="font-semibold text-foreground">
          {result.total_votes}
        </span>
        <span className="text-muted-foreground sm:hidden">
          {result.percentage}%
        </span>
      </div>
      <div className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">
        {result.percentage}%
      </div>
    </div>
  );
}

function ResultStat({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-white p-3 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold text-foreground">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function formatVoteCount(count: number) {
  if (count === 1) return "1 голос";
  if (count > 1 && count < 5) return `${count} голоси`;
  return `${count} голосів`;
}

function getParticipationLabel(totalVotes: number) {
  if (totalVotes === 0) return "немає голосів";
  if (totalVotes === 1) return "дуже ранні результати";
  if (totalVotes < 10) return "низька";
  if (totalVotes < 50) return "середня";
  return "висока";
}
