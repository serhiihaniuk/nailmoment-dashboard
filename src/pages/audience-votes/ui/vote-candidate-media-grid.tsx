"use client";

import { Images } from "lucide-react";

import type { VoteCandidateMedia } from "@/entities/audience-vote";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";
import { VoteCandidateMediaTile } from "./vote-candidate-media-tile";

export function VoteCandidateMediaGrid({
  canRestore,
  canSoftDelete,
  isDeleting,
  isRestoring,
  media,
  onRestore,
  onSoftDelete,
}: {
  canRestore?: boolean;
  canSoftDelete: boolean;
  isDeleting: boolean;
  isRestoring?: boolean;
  media: VoteCandidateMedia[];
  onRestore?: (media: VoteCandidateMedia) => void;
  onSoftDelete: (media: VoteCandidateMedia) => void;
}) {
  if (media.length === 0) {
    return (
      <Empty className="min-h-80 border border-border/70 bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Images aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Немає активних медіа</EmptyTitle>
          <EmptyDescription>
            Завантажте щонайменше одне публічне фото або відео перед
            відкриттям голосування.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {media.map((item) => (
        <VoteCandidateMediaTile
          canRestore={canRestore ?? false}
          canSoftDelete={canSoftDelete}
          isDeleting={isDeleting}
          isRestoring={isRestoring ?? false}
          key={item.id}
          media={item}
          onRestore={onRestore}
          onSoftDelete={onSoftDelete}
        />
      ))}
    </div>
  );
}
