"use client";

import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Vote,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AudienceVoteKind,
  AudienceVoteMiniAppResponse,
  MiniAppVoteCandidate,
  PublicVoteCandidateMedia,
  VoteCandidateId,
} from "@/entities/audience-vote";
import { cn } from "@/shared/lib/cn";
import type { CarouselApi } from "@/shared/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/ui/carousel";
import {
  fetchAudienceVoteMiniAppFeed,
  saveAudienceVoteMiniAppVote,
} from "../api/mini-app-client";
import {
  prepareTelegramMiniAppViewport,
  readTelegramInitData,
} from "../model/telegram-web-app";

type LoadState =
  | { status: "booting" }
  | { status: "missing-init-data" }
  | { status: "loading" }
  | { data: AudienceVoteMiniAppResponse; initData: string; status: "loaded" }
  | { message: string; status: "error" };

const miniAppHeaderLabel =
  "\u0413\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f";

export default function AudienceVoteMiniAppPage({
  dashboardPreview = false,
}: {
  dashboardPreview?: boolean;
}) {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "booting",
  });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      prepareTelegramMiniAppViewport();

      const initData = dashboardPreview
        ? "dashboard-preview"
        : readTelegramInitData();
      if (!initData) {
        if (!cancelled) {
          setLoadState({ status: "missing-init-data" });
        }
        return;
      }

      if (!cancelled) {
        setLoadState({ status: "loading" });
      }

      try {
        const data = await fetchAudienceVoteMiniAppFeed(initData, {
          dashboardPreview,
        });

        if (data.status === "open_vote") {
          prepareTelegramMiniAppViewport({ fullscreen: true });
        }

        if (!cancelled) {
          setLoadState({ data, initData, status: "loaded" });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            message:
              error instanceof Error
                ? error.message
                : "Не вдалося завантажити голосування.",
            status: "error",
          });
        }
      }
    }

    void loadFeed();

    return () => {
      cancelled = true;
    };
  }, [dashboardPreview, reloadCount]);

  return (
    <main className="tg-mini-app-safe-top tg-mini-app-no-select min-h-svh bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col sm:max-w-xl lg:max-w-2xl">
        <MiniAppHeader loadState={loadState} />
        <div className="flex-1 px-3 py-4">
          <MiniAppBody
            dashboardPreview={dashboardPreview}
            loadState={loadState}
            onRetry={() => setReloadCount((count) => count + 1)}
          />
        </div>
      </div>
    </main>
  );
}

function MiniAppHeader({ loadState }: { loadState: LoadState }) {
  const subtitle =
    loadState.status === "loaded" && loadState.data.status === "open_vote"
      ? formatAudienceVoteKind(loadState.data.vote.kind)
      : "Nail Moment";

  return (
    <header className="tg-mini-app-sticky-top sticky z-10 border-b border-white/10 bg-neutral-950 px-4 pb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">
            {miniAppHeaderLabel}
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold">
            {loadState.status === "loaded" &&
            loadState.data.status === "open_vote"
              ? loadState.data.vote.title
              : "Голосування"}
          </h1>
        </div>
        <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/70">
          {subtitle}
        </span>
      </div>
    </header>
  );
}

function MiniAppBody({
  dashboardPreview,
  loadState,
  onRetry,
}: {
  dashboardPreview: boolean;
  loadState: LoadState;
  onRetry: () => void;
}) {
  if (loadState.status === "booting" || loadState.status === "loading") {
    return (
      <CenteredPanel
        icon={<Loader2 aria-hidden="true" className="animate-spin" />}
        message="Завантажуємо голосування..."
        title="Секунду"
      />
    );
  }

  if (loadState.status === "missing-init-data") {
    return (
      <CenteredPanel
        icon={<ShieldAlert aria-hidden="true" />}
        message="Ця сторінка приймає голоси тільки з Telegram Mini App."
        title="Відкрийте через Telegram"
      />
    );
  }

  if (loadState.status === "error") {
    return (
      <CenteredPanel
        action={
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
            onClick={onRetry}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Оновити
          </button>
        }
        icon={<ShieldAlert aria-hidden="true" />}
        message={loadState.message}
        title="Не вдалося відкрити"
      />
    );
  }

  if (loadState.data.status === "update_screen") {
    return (
      <CenteredPanel
        message={loadState.data.update_screen.message}
        title={loadState.data.update_screen.title}
      />
    );
  }

  return (
    <VoteFeed
      data={loadState.data}
      initData={loadState.initData}
      previewMode={dashboardPreview}
    />
  );
}

function VoteFeed({
  data,
  initData,
  previewMode,
}: {
  data: Extract<AudienceVoteMiniAppResponse, { status: "open_vote" }>;
  initData: string;
  previewMode: boolean;
}) {
  const [selectedCandidateId, setSelectedCandidateId] =
    useState<VoteCandidateId | null>(data.selected_candidate_id);
  const [pendingCandidateId, setPendingCandidateId] =
    useState<VoteCandidateId | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const feedRef = useRef<HTMLElement | null>(null);

  const handleVideoPlay = useCallback((currentVideo: HTMLVideoElement) => {
    const videos = feedRef.current?.querySelectorAll("video") ?? [];

    videos.forEach((video) => {
      if (video !== currentVideo && !video.paused) {
        video.pause();
      }
    });
  }, []);

  async function handleVote(candidateId: VoteCandidateId) {
    if (previewMode || candidateId === selectedCandidateId) {
      return;
    }

    const previousCandidateId = selectedCandidateId;

    setSelectedCandidateId(candidateId);
    setPendingCandidateId(candidateId);
    setSaveError(null);

    try {
      const response = await saveAudienceVoteMiniAppVote({
        audienceVoteId: data.vote.id,
        candidateId,
        initData,
      });
      setSelectedCandidateId(response.selected_candidate_id);
    } catch (error) {
      setSelectedCandidateId(previousCandidateId);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти голос."
      );
    } finally {
      setPendingCandidateId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4" ref={feedRef}>
      {saveError ? (
        <div className="rounded-md border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {saveError}
        </div>
      ) : null}
      {previewMode ? (
        <div className="rounded-md border border-orange-300/30 bg-orange-950/40 px-3 py-2 text-sm text-orange-100">
          Режим перегляду з дашборду. Голоси тут не зберігаються.
        </div>
      ) : null}
      {data.candidates.map((candidate) => (
        <CandidateCard
          candidate={candidate}
          isPending={pendingCandidateId === candidate.id}
          isSelected={selectedCandidateId === candidate.id}
          key={candidate.id}
          onVideoPlay={handleVideoPlay}
          onVote={() => void handleVote(candidate.id)}
          votingLocked={previewMode || pendingCandidateId !== null}
        />
      ))}
    </section>
  );
}

function CandidateCard({
  candidate,
  isPending,
  isSelected,
  onVideoPlay,
  onVote,
  votingLocked,
}: {
  candidate: MiniAppVoteCandidate;
  isPending: boolean;
  isSelected: boolean;
  onVideoPlay: (video: HTMLVideoElement) => void;
  onVote: () => void;
  votingLocked: boolean;
}) {
  const buttonDisabled = votingLocked || isSelected;

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-neutral-900 shadow-2xl">
      <CandidateMediaCarousel
        candidate={candidate}
        onVideoPlay={onVideoPlay}
      />

      <div className="grid gap-3 p-4">
        <div>
          <h2 className="text-xl font-semibold leading-tight">
            {candidate.display_name}
          </h2>
          {candidate.caption ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">
              {candidate.caption}
            </p>
          ) : null}
        </div>
        <button
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition",
            isSelected
              ? "bg-emerald-500"
              : "bg-orange-500 hover:bg-orange-400",
            buttonDisabled && !isPending && "cursor-not-allowed opacity-70",
            isPending && "opacity-90"
          )}
          disabled={buttonDisabled}
          onClick={onVote}
          type="button"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : isSelected ? (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          ) : (
            <Vote aria-hidden="true" className="size-4" />
          )}
          {isPending
            ? "Зберігаємо..."
            : isSelected
              ? "Обрано"
              : "Голосувати"}
        </button>
      </div>
    </article>
  );
}

function CandidateMediaCarousel({
  candidate,
  onVideoPlay,
}: {
  candidate: MiniAppVoteCandidate;
  onVideoPlay: (video: HTMLVideoElement) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const hasMultipleMedia = candidate.media.length > 1;

  useEffect(() => {
    if (!api) {
      return;
    }

    function updateCurrentIndex() {
      setCurrentIndex(api?.selectedScrollSnap() ?? 0);
      const videos = carouselRef.current?.querySelectorAll("video") ?? [];
      videos.forEach((video) => video.pause());
    }

    updateCurrentIndex();
    api.on("select", updateCurrentIndex);
    api.on("reInit", updateCurrentIndex);

    return () => {
      api.off("select", updateCurrentIndex);
      api.off("reInit", updateCurrentIndex);
    };
  }, [api]);

  if (candidate.media.length === 0) {
    return (
      <div className="relative aspect-4/5 bg-neutral-800">
        <div className="flex size-full items-center justify-center text-white/45">
          <ImageIcon aria-hidden="true" className="size-10" />
        </div>
      </div>
    );
  }

  return (
    <div ref={carouselRef}>
      <Carousel
        className="relative aspect-4/5 overflow-hidden bg-neutral-800"
        opts={{ align: "start", loop: hasMultipleMedia }}
        setApi={setApi}
      >
        <CarouselContent className="h-full ml-0" viewportClassName="h-full">
          {candidate.media.map((media, index) => (
            <CarouselItem className="h-full pl-0" key={media.id}>
              <CandidateMedia
                candidateName={candidate.display_name}
                media={media}
                mediaNumber={index + 1}
                onVideoPlay={onVideoPlay}
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        {hasMultipleMedia ? (
          <>
            <CarouselPrevious
              aria-label="Попереднє медіа"
              className="left-3 size-11 border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/75 hover:text-white disabled:hidden"
            />
            <CarouselNext
              aria-label="Наступне медіа"
              className="right-3 size-11 border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/75 hover:text-white disabled:hidden"
            />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 backdrop-blur">
              {candidate.media.map((media, index) => (
                <button
                  aria-label={`Медіа ${index + 1}`}
                  className={cn(
                    "size-2 rounded-full bg-white/40 transition",
                    index === currentIndex && "w-5 bg-white"
                  )}
                  key={media.id}
                  onClick={() => api?.scrollTo(index)}
                  type="button"
                />
              ))}
            </div>
            <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {currentIndex + 1} / {candidate.media.length}
            </div>
          </>
        ) : null}
      </Carousel>
    </div>
  );
}

function CandidateMedia({
  candidateName,
  media,
  mediaNumber,
  onVideoPlay,
}: {
  candidateName: string;
  media: PublicVoteCandidateMedia;
  mediaNumber: number;
  onVideoPlay: (video: HTMLVideoElement) => void;
}) {
  if (media.media_type === "photo") {
    return (
      <div className="relative size-full overflow-hidden bg-neutral-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="absolute -inset-8 size-[calc(100%+4rem)] scale-115 object-cover opacity-70 blur-3xl saturate-125"
          draggable={false}
          src={media.blob_url}
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-1 flex size-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${candidateName}, медіа ${mediaNumber}`}
            className="h-auto max-h-full w-full object-contain shadow-2xl"
            draggable={false}
            src={media.blob_url}
          />
        </div>
      </div>
    );
  }

  return (
    <video
      className="size-full bg-black object-contain"
      controls
      onPlay={(event) => onVideoPlay(event.currentTarget)}
      playsInline
      preload="metadata"
      src={getVideoPreviewUrl(media.blob_url)}
    />
  );
}

function getVideoPreviewUrl(url: string) {
  const [urlWithoutHash] = url.split("#");

  return `${urlWithoutHash}#t=0.001`;
}

function CenteredPanel({
  action,
  icon,
  message,
  title,
}: {
  action?: ReactNode;
  icon?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <section className="flex min-h-[70svh] items-center justify-center">
      <div className="grid max-w-xs justify-items-center gap-4 text-center">
        {icon ? (
          <div className="flex size-11 items-center justify-center rounded-md bg-white/10 text-orange-300 [&_svg]:size-5">
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">{message}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

function formatAudienceVoteKind(kind: AudienceVoteKind): string {
  if (kind === "speaker") {
    return "Спікери";
  }

  if (kind === "battle") {
    return "Батл";
  }

  return "Фінальний батл";
}
