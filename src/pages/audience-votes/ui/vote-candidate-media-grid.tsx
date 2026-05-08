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
      <Empty className="border border-border/70">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Images aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No media</EmptyTitle>
          <EmptyDescription>
            Upload public Vote Candidate Media before this Audience Vote opens.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
