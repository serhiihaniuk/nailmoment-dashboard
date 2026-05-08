"use client";

import { Archive, X } from "lucide-react";

import type {
  AudienceVote,
  VoteCandidate,
  VoteCandidateMedia,
} from "@/entities/audience-vote";
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
    <section className="flex flex-col gap-4 rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Candidate media
            <Badge className="rounded-md" variant="outline">
              {candidate.display_name}
            </Badge>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.activeMedia.length} active / {state.archivedMedia.length}{" "}
            archived
          </p>
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
      {state.isClosed ? (
        <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Media management is locked for closed Audience Votes.
        </p>
      ) : (
        <VoteCandidateMediaUploadForm
          activeMedia={state.activeMedia}
          candidate={candidate}
          file={state.file}
          fileInputKey={state.fileInputKey}
          isUploading={state.isUploading}
          onFileChange={state.handleFileChange}
          onReplaceMediaChange={state.handleReplaceMediaChange}
          onUpload={state.uploadSelectedFile}
          replaceMediaSelectValue={state.replaceMediaSelectValue}
          uploadProgress={state.uploadProgress}
        />
      )}

      {state.formError ? (
        <p className="text-sm font-medium text-destructive">
          {state.formError}
        </p>
      ) : null}

      {state.isQueryError ? (
        <p className="text-sm font-medium text-destructive">
          Could not load media: {state.queryError?.message}
        </p>
      ) : null}

      {state.isLoading ? <Skeleton className="h-36 w-full rounded-lg" /> : null}

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
