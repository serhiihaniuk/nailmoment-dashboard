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
  canSoftDelete,
  isDeleting,
  media,
  onSoftDelete,
}: {
  canSoftDelete: boolean;
  isDeleting: boolean;
  media: VoteCandidateMedia[];
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
          canSoftDelete={canSoftDelete}
          isDeleting={isDeleting}
          key={item.id}
          media={item}
          onSoftDelete={onSoftDelete}
        />
      ))}
    </div>
  );
}
