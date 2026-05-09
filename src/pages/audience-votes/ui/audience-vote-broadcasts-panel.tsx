"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CircleStop,
  History,
  Loader2,
  Radio,
  Send,
  Timer,
} from "lucide-react";

import type {
  AudienceVote,
  AudienceVoteBroadcast,
  AudienceVoteBroadcastId,
  AudienceVoteBroadcastStatus,
} from "@/entities/audience-vote";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  fetchAudienceVoteBroadcasts,
  interruptAudienceVoteBroadcast,
  processAudienceVoteBroadcast,
  type AudienceVoteBroadcastApiError,
} from "../api/audience-vote-broadcasts-client";
import { formatAudienceVoteDate } from "../model/audience-vote-form";
import {
  formatAudienceVoteBroadcastNextStep,
  formatAudienceVoteBroadcastStatus,
  isAudienceVoteBroadcastDue,
  isAudienceVoteBroadcastInterruptible,
} from "../model/audience-vote-broadcast";
import { audienceVoteBroadcastsQueryKey } from "../model/use-audience-vote-broadcast-dialog";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

export function AudienceVoteBroadcastsPanel({
  votes,
}: {
  votes: AudienceVote[];
}) {
  const queryClient = useQueryClient();
  const voteTitles = useMemo(
    () => new Map(votes.map((vote) => [vote.id, vote.title])),
    [votes]
  );
  const {
    data: broadcasts,
    error,
    isError,
    isLoading,
  } = useQuery<AudienceVoteBroadcast[], Error>({
    queryKey: audienceVoteBroadcastsQueryKey,
    queryFn: fetchAudienceVoteBroadcasts,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const processMutation = useMutation<
    AudienceVoteBroadcast,
    AudienceVoteBroadcastApiError,
    AudienceVoteBroadcastId
  >({
    mutationFn: processAudienceVoteBroadcast,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteBroadcastsQueryKey,
      });
    },
  });

  const interruptMutation = useMutation<
    AudienceVoteBroadcast,
    AudienceVoteBroadcastApiError,
    AudienceVoteBroadcastId
  >({
    mutationFn: interruptAudienceVoteBroadcast,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: audienceVoteBroadcastsQueryKey,
      });
    },
  });

  const dueBroadcast = broadcasts?.find((broadcast) =>
    isAudienceVoteBroadcastDue(broadcast)
  );
  const orderedBroadcasts = useMemo(
    () =>
      [...(broadcasts ?? [])].sort(
        (first, second) =>
          second.created_at.getTime() - first.created_at.getTime()
      ),
    [broadcasts]
  );
  const featuredBroadcast =
    orderedBroadcasts.find((broadcast) =>
      isAudienceVoteBroadcastInterruptible(broadcast.status)
    ) ??
    orderedBroadcasts[0] ??
    null;
  const isFeaturedBroadcastRunning = featuredBroadcast
    ? isAudienceVoteBroadcastInterruptible(featuredBroadcast.status)
    : false;
  const processBroadcast = processMutation.mutate;
  const isProcessingBroadcast = processMutation.isPending;

  useEffect(() => {
    if (!dueBroadcast || isProcessingBroadcast) {
      return;
    }

    processBroadcast(dueBroadcast.id);
  }, [dueBroadcast, isProcessingBroadcast, processBroadcast]);

  const mutationError =
    processMutation.error?.message ?? interruptMutation.error?.message ?? null;
  const canViewAll = orderedBroadcasts.length > 0;

  return (
    <section>
      <Card className="gap-0 overflow-hidden shadow-surface">
        <CardHeader className="border-b border-border/60">
          <CardTitle>
            {isFeaturedBroadcastRunning ? "Активна розсилка" : "Остання розсилка"}
          </CardTitle>
          <CardDescription>
            {isFeaturedBroadcastRunning
              ? "Поточна доставка з можливістю скасування оператором."
              : "Останній запуск розсилки та короткий стан доставки."}
          </CardDescription>
          <CardAction className="flex flex-wrap items-center justify-end gap-2">
            {isProcessingBroadcast ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 aria-hidden="true" className="animate-spin" />
                Обробка
              </span>
            ) : null}
            <BroadcastHistoryDialog
              broadcasts={orderedBroadcasts}
              interruptDisabled={interruptMutation.isPending}
              onInterrupt={(broadcastId) =>
                interruptMutation.mutate(broadcastId)
              }
              openDisabled={!canViewAll}
              voteTitles={voteTitles}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4">
          {isError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Не вдалося завантажити розсилки</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          {mutationError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Дія з розсилкою не вдалася</AlertTitle>
              <AlertDescription>{mutationError}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? <Skeleton className="h-36 w-full rounded-lg" /> : null}

          {!isLoading && broadcasts && broadcasts.length === 0 ? (
            <Empty className="border border-border/70 bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Send aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Ще немає розсилок</EmptyTitle>
                <EmptyDescription>
                  Створіть розсилку, коли виборцям потрібне нагадування в
                  Telegram.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!isLoading && featuredBroadcast ? (
            <div className="overflow-hidden rounded-lg border border-border/70">
              <BroadcastRow
                broadcast={featuredBroadcast}
                interruptDisabled={interruptMutation.isPending}
                onInterrupt={() => interruptMutation.mutate(featuredBroadcast.id)}
                voteTitle={
                  voteTitles.get(featuredBroadcast.audience_vote_id) ??
                  "Голосування"
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function BroadcastHistoryDialog({
  broadcasts,
  interruptDisabled,
  onInterrupt,
  openDisabled,
  voteTitles,
}: {
  broadcasts: AudienceVoteBroadcast[];
  interruptDisabled: boolean;
  onInterrupt: (broadcastId: AudienceVoteBroadcastId) => void;
  openDisabled: boolean;
  voteTitles: ReadonlyMap<AudienceVote["id"], string>;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={openDisabled} size="sm" variant="outline">
          <History aria-hidden="true" data-icon="inline-start" />
          Усі розсилки
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Усі розсилки</DialogTitle>
          <DialogDescription>
            Повна історія розсилок із текстом повідомлення та станом доставки.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border border-border/70">
          {broadcasts.map((broadcast) => (
            <BroadcastRow
              broadcast={broadcast}
              interruptDisabled={interruptDisabled}
              key={broadcast.id}
              messagePreview="full"
              onInterrupt={() => onInterrupt(broadcast.id)}
              voteTitle={
                voteTitles.get(broadcast.audience_vote_id) ?? "Голосування"
              }
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BroadcastRow({
  broadcast,
  interruptDisabled,
  messagePreview = "compact",
  onInterrupt,
  voteTitle,
}: {
  broadcast: AudienceVoteBroadcast;
  interruptDisabled: boolean;
  messagePreview?: "compact" | "full";
  onInterrupt: () => void;
  voteTitle: string;
}) {
  const canarySent =
    broadcast.delivery_counts.operator_canary.sent +
    broadcast.delivery_counts.voter_canary.sent;
  const canaryFailed =
    broadcast.delivery_counts.operator_canary.failed +
    broadcast.delivery_counts.voter_canary.failed;
  const nextStageTiming = formatBroadcastTiming(broadcast);

  return (
    <div className="grid gap-3 border-b border-border/60 p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_18rem_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="rounded-md"
            variant={getBroadcastStatusBadgeVariant(broadcast.status)}
          >
            {formatAudienceVoteBroadcastStatus(broadcast.status)}
          </Badge>
          <span className="text-sm font-medium">{voteTitle}</span>
          {broadcast.include_open_button ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Radio aria-hidden="true" size={12} />
              Кнопка Mini App
            </span>
          ) : null}
        </div>
        <p
          className={
            messagePreview === "compact"
              ? "mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-sm text-foreground"
              : "mt-2 whitespace-pre-wrap text-sm text-foreground"
          }
        >
          {broadcast.message_text}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Створено {formatAudienceVoteDate(broadcast.created_at)}
        </p>
      </div>

      <div className="grid gap-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">
            {broadcast.estimated_recipient_count}
          </span>{" "}
          активних виборців у цілі
        </p>
        <p>
          Тестова хвиля: надіслано {canarySent}
          {canaryFailed > 0 ? ` / помилок ${canaryFailed}` : ""}
        </p>
        <p>
          Основна доставка: надіслано {broadcast.delivery_counts.normal.sent} /
          очікує{" "}
          {broadcast.delivery_counts.normal.pending}
          {broadcast.delivery_counts.normal.failed > 0
            ? ` / помилок ${broadcast.delivery_counts.normal.failed}`
            : ""}
        </p>
        <p>{formatAudienceVoteBroadcastNextStep(broadcast)}</p>
        {nextStageTiming ? (
          <div className="mt-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <Timer aria-hidden="true" className="size-3.5" />
              Таймер
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {nextStageTiming.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {nextStageTiming.detail}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex justify-start lg:justify-end">
        {isAudienceVoteBroadcastInterruptible(broadcast.status) ? (
          <Button
            disabled={interruptDisabled}
            onClick={onInterrupt}
            size="sm"
            variant="destructive"
          >
            <CircleStop aria-hidden="true" data-icon="inline-start" />
            Скасувати
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function formatBroadcastTiming(
  broadcast: AudienceVoteBroadcast,
  now = new Date()
) {
  if (!isAudienceVoteBroadcastInterruptible(broadcast.status)) {
    return null;
  }

  if (broadcast.status === "ready") {
    return {
      detail: `Оновлено ${formatAudienceVoteDate(broadcast.updated_at)}`,
      label:
        broadcast.delivery_counts.normal.pending > 0
          ? "Доставка триває"
          : "Завершуємо доставку",
    };
  }

  const remainingMs = broadcast.next_stage_at.getTime() - now.getTime();
  const absoluteTime = formatAudienceVoteDate(broadcast.next_stage_at);

  if (remainingMs <= 0) {
    return {
      detail: `Заплановано на ${absoluteTime}`,
      label: `Час наступного кроку минув ${formatDuration(-remainingMs)} тому`,
    };
  }

  return {
    detail: `Наступний крок о ${absoluteTime}`,
    label: `Наступний крок через ${formatDuration(remainingMs)}`,
  };
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0
      ? `${hours} год ${remainingMinutes} хв`
      : `${hours} год`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes} хв ${seconds} с` : `${minutes} хв`;
  }

  return `${seconds} с`;
}

function getBroadcastStatusBadgeVariant(
  status: AudienceVoteBroadcastStatus
): BadgeVariant {
  if (status === "completed") {
    return "success";
  }

  if (status === "interrupted" || status === "failed") {
    return "destructive";
  }

  if (
    status === "canary_operator_sent" ||
    status === "canary_voters_sent" ||
    status === "ready"
  ) {
    return "secondary";
  }

  return "outline";
}
