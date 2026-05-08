"use client";

import {
  ExternalLink,
  ImageIcon,
  Loader2,
  Trash2,
  Video,
} from "lucide-react";

import type { VoteCandidateMedia } from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { formatVoteCandidateMediaFileSize } from "../model/vote-candidate-media";

export function VoteCandidateMediaTile({
  canSoftDelete,
  isDeleting,
  media,
  onSoftDelete,
}: {
  canSoftDelete: boolean;
  isDeleting: boolean;
  media: VoteCandidateMedia;
  onSoftDelete: (media: VoteCandidateMedia) => void;
}) {
  return (
    <Card className="gap-3 py-3 shadow-none">
      <CardHeader className="grid-cols-[1fr_auto] gap-3 px-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {media.media_type === "photo" ? (
            <ImageIcon aria-hidden="true" />
          ) : (
            <Video aria-hidden="true" />
          )}
          <span className="truncate">{media.file_name}</span>
        </CardTitle>
        <CardAction>
          <MediaTileActions
            canSoftDelete={canSoftDelete}
            isArchived={media.archived}
            isDeleting={isDeleting}
            media={media}
            onSoftDelete={onSoftDelete}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-2 px-3">
        <MediaPreview media={media} />
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>#{media.display_order}</span>
          <span className="text-border">/</span>
          <span>{formatVoteCandidateMediaFileSize(media.file_size_bytes)}</span>
          {media.archived ? (
            <>
              <span className="text-border">/</span>
              <span>Archived</span>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MediaPreview({ media }: { media: VoteCandidateMedia }) {
  return (
    <div className="aspect-video overflow-hidden rounded-md bg-muted">
      {media.media_type === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.file_name}
          className="size-full object-cover"
          src={media.blob_url}
        />
      ) : (
        <video className="size-full bg-black object-contain" controls>
          <source src={media.blob_url} type={media.content_type} />
        </video>
      )}
    </div>
  );
}

function MediaTileActions({
  canSoftDelete,
  isArchived,
  isDeleting,
  media,
  onSoftDelete,
}: {
  canSoftDelete: boolean;
  isArchived: boolean;
  isDeleting: boolean;
  media: VoteCandidateMedia;
  onSoftDelete: (media: VoteCandidateMedia) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button asChild size="icon-sm" variant="ghost">
        <a
          aria-label="Open media"
          href={media.blob_url}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
      {!isArchived ? (
        <Button
          aria-label="Soft-delete media"
          disabled={!canSoftDelete || isDeleting}
          onClick={() => onSoftDelete(media)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {isDeleting ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
