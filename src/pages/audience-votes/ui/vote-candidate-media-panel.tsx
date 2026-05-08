"use client";

import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Lock,
  X,
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
    <section className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">Candidate media</h3>
            <Badge className="rounded-md" variant="outline">
              {candidate.display_name}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge className="rounded-md" variant="secondary">
              {state.activeMedia.length} active
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {state.archivedMedia.length} archived
            </Badge>
            <span>{vote.title}</span>
          </div>
        </div>
        <Button
          aria-label="Close media panel"
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {state.isClosed ? (
            <Alert>
              <Lock aria-hidden="true" />
              <AlertTitle>Media locked</AlertTitle>
              <AlertDescription>
                Media management is locked for closed Audience Votes.
              </AlertDescription>
            </Alert>
          ) : (
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
          )}

          {state.formError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Media update failed</AlertTitle>
              <AlertDescription>{state.formError}</AlertDescription>
            </Alert>
          ) : null}

          {state.successMessage ? (
            <Alert>
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>{state.successMessage}</AlertTitle>
              <AlertDescription>
                The candidate media list has been refreshed.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium">Media library</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Active files appear in voter-facing order.
              </p>
            </div>
          </div>

          {state.isQueryError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Could not load media</AlertTitle>
              <AlertDescription>
                {state.queryError?.message ?? "Refresh the media panel."}
              </AlertDescription>
            </Alert>
          ) : null}

          {state.isLoading ? (
            <Skeleton className="h-80 w-full rounded-lg" />
          ) : null}

          {!state.isLoading && !state.isQueryError ? (
            <>
              <VoteCandidateMediaGrid
                canSoftDelete={state.canSoftDelete}
                isDeleting={state.isDeleting}
                media={state.activeMedia}
                onSoftDelete={state.softDeleteMedia}
              />
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
        {showArchived ? "Hide archived" : "Show archived"}
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
