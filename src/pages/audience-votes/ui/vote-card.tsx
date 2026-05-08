"use client";

import type { AudienceVote, AudienceVoteStatus } from "@/entities/audience-vote";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import { ChevronRight, Users } from "lucide-react";
import {
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
  formatAudienceVoteDate,
} from "../model/audience-vote-form";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

interface VoteCardProps {
  vote: AudienceVote;
  isSelected: boolean;
  onClick: () => void;
}

export function VoteCard({ vote, isSelected, onClick }: VoteCardProps) {
  const candidateCount = vote.candidates?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b border-border/40 last:border-b-0",
        "transition-colors hover:bg-muted/30 active:bg-muted/50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isSelected && "bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title row with status indicator */}
          <div className="flex items-center gap-2.5">
            <StatusDot status={vote.status} />
            <span className="text-[14px] font-medium text-foreground truncate">
              {vote.title}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1.5 pl-5">
            <Badge
              className="rounded-md text-[10px] px-1.5 py-0"
              variant={getStatusBadgeVariant(vote.status)}
            >
              {formatAudienceVoteStatus(vote.status)}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {formatAudienceVoteKind(vote.kind)}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users size={11} className="shrink-0" />
              {candidateCount} {candidateCount === 1 ? "candidate" : "candidates"}
            </span>
          </div>

          {/* Date row */}
          <div className="mt-1.5 pl-5 text-[11px] text-muted-foreground/70">
            Created {formatAudienceVoteDate(vote.created_at)}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          size={16}
          className="shrink-0 text-muted-foreground/50 mt-1"
        />
      </div>
    </button>
  );
}

function StatusDot({ status }: { status: AudienceVoteStatus }) {
  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full shrink-0",
        status === "open" && "bg-success",
        status === "scheduled" && "bg-warning",
        status === "draft" && "bg-muted-foreground/40",
        status === "closed" && "bg-destructive/60",
      )}
    />
  );
}

function getStatusBadgeVariant(status: AudienceVoteStatus): BadgeVariant {
  if (status === "open") return "success";
  if (status === "closed") return "destructive";
  if (status === "scheduled") return "secondary";
  return "outline";
}
