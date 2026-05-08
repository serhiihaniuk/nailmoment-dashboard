"use client";

import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Vote,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type {
  AudienceVoteKind,
  AudienceVoteMiniAppResponse,
  AudienceVoteUpdateScreenNextVote,
  MiniAppVoteCandidate,
  PublicAudienceVoteUpdateScreen,
  PublicVoteCandidateMedia,
  VoteCandidateId,
} from "@/entities/audience-vote";
import { cn } from "@/shared/lib/cn";
import {
  fetchAudienceVoteMiniAppFeed,
  saveAudienceVoteMiniAppVote,
} from "../api/mini-app-client";
import {
  getTelegramWebApp,
  readTelegramInitData,
} from "../model/telegram-web-app";

type LoadState =
  | { status: "booting" }
  | { status: "missing-init-data" }
  | { status: "loading" }
  | { data: AudienceVoteMiniAppResponse; initData: string; status: "loaded" }
  | { message: string; status: "error" };

export default function AudienceVoteMiniAppPage() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "booting",
  });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      const webApp = getTelegramWebApp();
      webApp?.ready?.();
      webApp?.expand?.();

      const initData = readTelegramInitData();
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
        const data = await fetchAudienceVoteMiniAppFeed(initData);

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
  }, [reloadCount]);

  return (
    <main className="min-h-svh bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
        <MiniAppHeader loadState={loadState} />
        <div className="flex-1 px-3 py-4">
          <MiniAppBody
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
    <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">
            Audience Vote
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
  loadState,
  onRetry,
}: {
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
    return <UpdateScreen updateScreen={loadState.data.update_screen} />;
  }

  return <VoteFeed data={loadState.data} initData={loadState.initData} />;
}

function UpdateScreen({
  updateScreen,
}: {
  updateScreen: PublicAudienceVoteUpdateScreen;
}) {
  const hasButton = Boolean(
    updateScreen.button_label && updateScreen.button_url
  );

  return (
    <CenteredPanel
      action={
        hasButton ? (
          <a
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
            href={updateScreen.button_url ?? undefined}
            rel="noreferrer"
            target="_blank"
          >
            {updateScreen.button_label}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        ) : undefined
      }
      icon={<CalendarClock aria-hidden="true" />}
      message={updateScreen.body}
      title={updateScreen.headline}
    >
      {updateScreen.next_vote ? (
        <div className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
            Далі
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {updateScreen.next_vote.title}
          </p>
          <p className="mt-1 text-xs text-white/60">
            {formatAudienceVoteKind(updateScreen.next_vote.kind)}
            {formatNextVoteWindow(updateScreen.next_vote)}
          </p>
        </div>
      ) : null}
    </CenteredPanel>
  );
}

function VoteFeed({
  data,
  initData,
}: {
  data: Extract<AudienceVoteMiniAppResponse, { status: "open_vote" }>;
  initData: string;
}) {
  const [selectedCandidateId, setSelectedCandidateId] =
    useState<VoteCandidateId | null>(data.selected_candidate_id);
  const [pendingCandidateId, setPendingCandidateId] =
    useState<VoteCandidateId | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleVote(candidateId: VoteCandidateId) {
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
    <section className="flex flex-col gap-4">
      {saveError ? (
        <div className="rounded-md border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {saveError}
        </div>
      ) : null}
      {data.candidates.map((candidate) => (
        <CandidateCard
          candidate={candidate}
          isPending={pendingCandidateId === candidate.id}
          isSelected={selectedCandidateId === candidate.id}
          key={candidate.id}
          onVote={() => void handleVote(candidate.id)}
          votingLocked={pendingCandidateId !== null}
        />
      ))}
    </section>
  );
}

function CandidateCard({
  candidate,
  isPending,
  isSelected,
  onVote,
  votingLocked,
}: {
  candidate: MiniAppVoteCandidate;
  isPending: boolean;
  isSelected: boolean;
  onVote: () => void;
  votingLocked: boolean;
}) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const currentMedia = candidate.media[mediaIndex] ?? null;

  function showPreviousMedia() {
    setMediaIndex((index) =>
      index === 0 ? candidate.media.length - 1 : index - 1
    );
  }

  function showNextMedia() {
    setMediaIndex((index) =>
      index >= candidate.media.length - 1 ? 0 : index + 1
    );
  }

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-neutral-900 shadow-2xl">
      <div className="relative aspect-4/5 bg-neutral-800">
        {currentMedia ? (
          <CandidateMedia
            candidateName={candidate.display_name}
            media={currentMedia}
            mediaNumber={mediaIndex + 1}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-white/45">
            <ImageIcon aria-hidden="true" className="size-10" />
          </div>
        )}

        {candidate.media.length > 1 ? (
          <>
            <button
              aria-label="Попереднє медіа"
              className="absolute left-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              onClick={showPreviousMedia}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              aria-label="Наступне медіа"
              className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              onClick={showNextMedia}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md bg-black/50 px-2 py-1 backdrop-blur">
              {candidate.media.map((media, index) => (
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-white/35",
                    index === mediaIndex && "bg-white"
                  )}
                  key={media.id}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

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
              ? "bg-emerald-500 hover:bg-emerald-400"
              : "bg-orange-500 hover:bg-orange-400",
            votingLocked && !isPending && "opacity-60",
            isPending && "opacity-90"
          )}
          disabled={votingLocked}
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

function CandidateMedia({
  candidateName,
  media,
  mediaNumber,
}: {
  candidateName: string;
  media: PublicVoteCandidateMedia;
  mediaNumber: number;
}) {
  if (media.media_type === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${candidateName}, медіа ${mediaNumber}`}
        className="size-full object-cover"
        src={media.blob_url}
      />
    );
  }

  return (
    <video
      className="size-full bg-black object-contain"
      controls
      playsInline
      preload="metadata"
    >
      <source src={media.blob_url} type={media.content_type} />
    </video>
  );
}

function CenteredPanel({
  action,
  children,
  icon,
  message,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
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
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/70">
            {message}
          </p>
        </div>
        {children}
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

function formatNextVoteWindow({
  window_end,
  window_start,
}: AudienceVoteUpdateScreenNextVote): string {
  if (window_start && window_end) {
    return ` / ${formatMiniAppDate(window_start)} - ${formatMiniAppDate(
      window_end
    )}`;
  }

  if (window_start) {
    return ` / ${formatMiniAppDate(window_start)}`;
  }

  if (window_end) {
    return ` / до ${formatMiniAppDate(window_end)}`;
  }

  return "";
}

function formatMiniAppDate(value: Date): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Warsaw",
  }).format(value);
}
