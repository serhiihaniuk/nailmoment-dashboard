"use client";

import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Lock,
  X,
  Images,
} from "lucide-react";

import type {
  AudienceVote,
  VoteCandidate,
  VoteCandidateMedia,
} from "@/entities/audience-vote";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { useVoteCandidateMedia } from "../model/use-vote-candidate-media";
import { VoteCandidateMediaGrid } from "./vote-candidate-media-grid";
import { VoteCandidateMediaUploadForm } from "./vote-candidate-media-upload-form";

export function VoteCandidateMediaPanel({
  candidate,
  onClose,
  vote,
}: {
  candidate: VoteCandidate;
  onClose: () => void;
  vote: AudienceVote;
}) {
  const state = useVoteCandidateMedia({ candidate, vote });

  return (
    <section className="overflow-hidden rounded-xl border-2 border-primary/20 bg-linear-to-b from-primary/5 to-background shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 bg-white/80 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Images className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Керування медіа</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {candidate.display_name}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge className="rounded-md bg-emerald-100 text-emerald-700 border-emerald-200/50">
              {state.activeMedia.length} активних
            </Badge>
            {state.archivedMedia.length > 0 && (
              <Badge className="rounded-md" variant="outline">
                {state.archivedMedia.length} в архіві
              </Badge>
            )}
          </div>
        </div>
        <Button
          aria-label="Закрити панель медіа"
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
          className="rounded-full hover:bg-muted"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      {/* Content */}
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        {/* Upload section */}
        <div className="flex flex-col gap-3">
          {state.isClosed ? (
            <Alert className="border-amber-200 bg-amber-50/50">
              <Lock aria-hidden="true" className="text-amber-600" />
              <AlertTitle className="text-amber-800">Медіа заблоковано</AlertTitle>
              <AlertDescription className="text-amber-700">
                Керування медіа заблоковано для закритих голосувань.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-lg border border-border/50 bg-white p-4">
              <VoteCandidateMediaUploadForm
                activeMedia={state.activeMedia}
                candidate={candidate}
                file={state.file}
                fileInputKey={state.fileInputKey}
                isUploading={state.isUploading}
                onFileChange={state.handleFileChange}
                onFileSelect={state.selectFile}
                onReplaceMediaChange={state.handleReplaceMediaChange}
                onUpload={state.uploadSelectedFile}
                replaceMediaSelectValue={state.replaceMediaSelectValue}
                uploadProgress={state.uploadProgress}
              />
            </div>
          )}

          {state.formError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Не вдалося оновити медіа</AlertTitle>
              <AlertDescription>{state.formError}</AlertDescription>
            </Alert>
          ) : null}

          {state.successMessage ? (
            <Alert className="border-emerald-200 bg-emerald-50/50">
              <CheckCircle2 aria-hidden="true" className="text-emerald-600" />
              <AlertTitle className="text-emerald-800">{state.successMessage}</AlertTitle>
              <AlertDescription className="text-emerald-700">
                Список медіа кандидата оновлено.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        {/* Media library */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">Медіатека</h4>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Активні файли показуються виборцям у цьому порядку
              </p>
            </div>
          </div>

          {state.isQueryError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Не вдалося завантажити медіа</AlertTitle>
              <AlertDescription>
                {state.queryError?.message ?? "Оновіть панель медіа."}
              </AlertDescription>
            </Alert>
          ) : null}

          {state.isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : null}

          {!state.isLoading && !state.isQueryError ? (
            <>
              {state.activeMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/60 rounded-lg bg-muted/20">
                  <Images className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Медіа ще не завантажено
                  </p>
                  <p className="text-[12px] text-muted-foreground/70 mt-1">
                    Завантажте фото або відео для цього кандидата
                  </p>
                </div>
              ) : (
                <VoteCandidateMediaGrid
                  canSoftDelete={state.canSoftDelete}
                  isDeleting={state.isDeleting}
                  media={state.activeMedia}
                  onSoftDelete={state.softDeleteMedia}
                />
              )}
              
              {state.archivedMedia.length > 0 ? (
                <>
                  <Separator />
                  <ArchivedMediaSection
                    canSoftDelete={state.canSoftDelete}
                    isDeleting={state.isDeleting}
                    media={state.archivedMedia}
                    onSoftDelete={state.softDeleteMedia}
                    onToggle={() => state.setShowArchived(!state.showArchived)}
                    showArchived={state.showArchived}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ArchivedMediaSection({
  canSoftDelete,
  isDeleting,
  media,
  onSoftDelete,
  onToggle,
  showArchived,
}: {
  canSoftDelete: boolean;
  isDeleting: boolean;
  media: VoteCandidateMedia[];
  onSoftDelete: (media: VoteCandidateMedia) => void;
  onToggle: () => void;
  showArchived: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        className="self-start"
        onClick={onToggle}
        size="sm"
        type="button"
        variant="outline"
      >
        <Archive aria-hidden="true" data-icon="inline-start" />
        {showArchived ? "Сховати архів" : `Показати архів (${media.length})`}
      </Button>
      {showArchived ? (
        <VoteCandidateMediaGrid
          canSoftDelete={canSoftDelete}
          isDeleting={isDeleting}
          media={media}
          onSoftDelete={onSoftDelete}
        />
      ) : null}
    </div>
  );
}
