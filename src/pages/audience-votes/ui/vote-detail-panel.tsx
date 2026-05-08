"use client";

import { useState } from "react";
import { BarChart3, ChevronDown, Pencil, Send, Settings } from "lucide-react";

import type { AudienceVote, AudienceVoteStatus } from "@/entities/audience-vote";
import { SlidePanel } from "@/shared/ui/slide-panel";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import {
  formatAudienceVoteKind,
  formatAudienceVoteStatus,
  formatAudienceVoteWindow,
} from "../model/audience-vote-form";
import { VoteResultsSection } from "./vote-results-section";
import { VoteBroadcastsSection } from "./vote-broadcasts-section";
import { AudienceVoteCandidatesDialog } from "./audience-vote-candidates-dialog";
import { AudienceVoteLifecycleActions } from "./audience-vote-lifecycle-actions";

type BadgeVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "success";

interface VoteDetailPanelProps {
  vote: AudienceVote | null;
  onClose: () => void;
  onSendBroadcast: (vote: AudienceVote) => void;
}

export function VoteDetailPanel({ vote, onClose, onSendBroadcast }: VoteDetailPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["results", "broadcasts"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <SlidePanel
      open={!!vote}
      onClose={onClose}
      footer={vote ? <PanelFooter vote={vote} /> : undefined}
    >
      {vote && (
        <div className="flex flex-col gap-0 animate-in-fade">
          {/* Header */}
          <div className="pt-4 pb-5">
            <div className="flex items-center gap-2 mb-2">
              <StatusDot status={vote.status} />
              <Badge
                className="rounded-md text-[10px]"
                variant={getStatusBadgeVariant(vote.status)}
              >
                {formatAudienceVoteStatus(vote.status)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {formatAudienceVoteKind(vote.kind)}
              </span>
            </div>
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
              {vote.title}
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {formatAudienceVoteWindow(vote) || "No schedule set"}
            </p>
          </div>

          {/* Results Section */}
          <CollapsibleSection
            icon={<BarChart3 size={14} />}
            title="Results"
            isExpanded={expandedSections.has("results")}
            onToggle={() => toggleSection("results")}
          >
            <VoteResultsSection vote={vote} />
          </CollapsibleSection>

          {/* Broadcasts Section */}
          <CollapsibleSection
            icon={<Send size={14} />}
            title="Broadcasts"
            isExpanded={expandedSections.has("broadcasts")}
            onToggle={() => toggleSection("broadcasts")}
          >
            <VoteBroadcastsSection
              vote={vote}
              onSendBroadcast={() => onSendBroadcast(vote)}
            />
          </CollapsibleSection>

          {/* Actions Section */}
          <CollapsibleSection
            icon={<Settings size={14} />}
            title="Actions"
            isExpanded={expandedSections.has("actions")}
            onToggle={() => toggleSection("actions")}
          >
            <div className="space-y-3">
              {/* Edit Candidates */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium">Candidates</p>
                  <p className="text-[11px] text-muted-foreground">
                    {vote.candidates?.length ?? 0} candidates configured
                  </p>
                </div>
                <AudienceVoteCandidatesDialog vote={vote} />
              </div>

              {/* Vote status info */}
              <div className="pt-2 border-t border-border/40">
                <p className="text-[11px] text-muted-foreground mb-2">
                  Vote ID: {vote.id}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </SlidePanel>
  );
}

function PanelFooter({ vote }: { vote: AudienceVote }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <AudienceVoteLifecycleActions vote={vote} />
    </div>
  );
}

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  icon,
  title,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-t border-border/60">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-muted/30 -mx-6 px-6 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-[13px] font-medium">{title}</span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>
      {isExpanded && <div className="pb-5 -mt-1">{children}</div>}
    </div>
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
