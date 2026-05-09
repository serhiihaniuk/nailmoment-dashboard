"use client";

import { useState } from "react";
import {
  Download,
  ExternalLink,
  ImageIcon,
  ImageOff,
  Loader2,
  Trash2,
  Video,
} from "lucide-react";

import type { VoteCandidateMedia } from "@/entities/audience-vote";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  canBrowserPreviewVoteCandidateMedia,
  formatVoteCandidateMediaFileSize,
  formatVoteCandidateMediaType,
} from "../model/vote-candidate-media";

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
    <Card className="gap-3 overflow-hidden py-0 shadow-none">
      <CardHeader className="grid-cols-[1fr_auto] gap-3 px-3 pt-3">
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
      <CardContent className="grid gap-3 px-3 pb-3">
        <MediaPreview media={media} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-md" variant="secondary">
            #{media.display_order}
          </Badge>
          <Badge className="rounded-md" variant="outline">
            {formatVoteCandidateMediaType(media.media_type)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatVoteCandidateMediaFileSize(media.file_size_bytes)}
          </span>
          {media.archived ? (
            <Badge className="rounded-md" variant="outline">
              В архіві
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MediaPreview({ media }: { media: VoteCandidateMedia }) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const canPreview =
    !previewFailed &&
    canBrowserPreviewVoteCandidateMedia({
      contentType: media.content_type,
      mediaType: media.media_type,
    });

  if (!canPreview) {
    return <MediaPreviewFallback media={media} />;
  }

  return (
    <div className="aspect-4/5 overflow-hidden rounded-md bg-muted">
      {media.media_type === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.file_name}
          className="size-full object-contain"
          onError={() => setPreviewFailed(true)}
          src={media.blob_url}
        />
      ) : (
        <video
          className="size-full bg-black object-contain"
          controls
          onError={() => setPreviewFailed(true)}
          preload="metadata"
        >
          <source src={media.blob_url} type={media.content_type} />
        </video>
      )}
    </div>
  );
}

function MediaPreviewFallback({ media }: { media: VoteCandidateMedia }) {
  return (
    <div className="flex aspect-4/5 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4 text-center">
      <ImageOff aria-hidden="true" className="size-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Попередній перегляд недоступний</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {media.content_type} все ще можна відкрити напряму.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={media.blob_url} rel="noreferrer" target="_blank">
            <ExternalLink aria-hidden="true" data-icon="inline-start" />
            Відкрити
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={media.blob_download_url} rel="noreferrer" target="_blank">
            <Download aria-hidden="true" data-icon="inline-start" />
            Завантажити
          </a>
        </Button>
      </div>
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
          aria-label="Відкрити медіа"
          href={media.blob_url}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" data-icon="inline-start" />
        </a>
      </Button>
      {!isArchived ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              aria-label="Приховати медіа"
              disabled={!canSoftDelete || isDeleting}
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
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Видалити медіа?</AlertDialogTitle>
              <AlertDialogDescription>
                Це медіа буде приховано з активного списку кандидата. Дію можна
                виконувати лише до відкриття голосування.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Скасувати
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={() => onSoftDelete(media)}
              >
                Видалити
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
