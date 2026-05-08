"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  ChevronLeft,
  ChevronRight,
  ImagePlus, 
  Loader2, 
  Plus, 
  Trash2, 
  Upload, 
  Users, 
  X,
  Pencil,
  Check,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/ui/utils";

import type { AudienceVote, VoteCandidate } from "@/entities/audience-vote";
import { VOTE_CANDIDATE_MEDIA_ACCEPT } from "@/entities/audience-vote";
import { formatAudienceVoteStatus } from "../model/audience-vote-form";
import { useVoteCandidatesDialog } from "../model/use-vote-candidates-dialog";
import { useVoteCandidateMedia, addNewMediaSelectValue } from "../model/use-vote-candidate-media";

export function AudienceVoteCandidatesDialog({ vote }: { vote: AudienceVote }) {
  const state = useVoteCandidatesDialog(vote);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  
  const selectedCandidate = state.candidates.find(c => c.id === selectedCandidateId) ?? null;
  
  const handleOpenChange = (open: boolean) => {
    state.handleOpenChange(open);
    if (!open) {
      setSelectedCandidateId(null);
    }
  };

  // Auto-select first candidate when list loads
  useEffect(() => {
    if (state.candidates.length > 0 && !selectedCandidateId && !state.isLoading) {
      setSelectedCandidateId(state.candidates[0].id);
    }
  }, [state.candidates, selectedCandidateId, state.isLoading]);

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
          <Users size={14} />
          Candidates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] sm:max-h-[90vh] overflow-hidden w-[95vw] sm:w-[90vw] sm:max-w-5xl lg:max-w-6xl p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border/50 bg-muted/30 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg">Manage Candidates</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 flex-wrap text-[12px] sm:text-sm">
                <span className="font-medium text-foreground truncate">{vote.title}</span>
                <Badge 
                  variant={vote.status === "open" ? "default" : vote.status === "closed" ? "destructive" : "secondary"}
                  className="rounded-md text-[10px] px-1.5"
                >
                  {formatAudienceVoteStatus(vote.status)}
                </Badge>
              </DialogDescription>
            </div>
            {!state.isLocked && (
              <div className="text-right text-[12px] text-muted-foreground shrink-0">
                <span className="font-medium text-foreground">{state.candidates.length}</span> candidates
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Main content - master detail */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left panel - candidates list */}
          <div className="w-56 sm:w-64 border-r border-border/50 flex flex-col bg-muted/20 shrink-0">
            {/* Add new candidate form (if not locked) */}
            {!state.isLocked && (
              <div className="p-3 border-b border-border/40">
                <form onSubmit={state.handleCreateSubmit} className="space-y-2">
                  <Input
                    placeholder="New candidate name..."
                    value={state.draft.name}
                    onChange={(e) => state.updateDraft("name", e.target.value)}
                    className="h-8 text-[13px]"
                    disabled={state.isCreating}
                  />
                  {state.errors.name && (
                    <p className="text-[11px] text-destructive">{state.errors.name}</p>
                  )}
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="w-full h-7 text-[12px]"
                    disabled={state.isCreating || !state.draft.name.trim()}
                  >
                    {state.isCreating ? (
                      <Loader2 size={12} className="animate-spin mr-1" />
                    ) : (
                      <Plus size={12} className="mr-1" />
                    )}
                    Add Candidate
                  </Button>
                </form>
              </div>
            )}
            
            {/* Candidates list */}
            <div className="flex-1 overflow-y-auto">
              {state.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : state.candidates.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-muted-foreground">
                  No candidates yet
                </div>
              ) : (
                <div className="py-1">
                  {state.candidates.map((candidate, index) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setSelectedCandidateId(candidate.id)}
                      className={cn(
                        "w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors",
                        "hover:bg-muted/60",
                        selectedCandidateId === candidate.id 
                          ? "bg-muted/80 border-l-2 border-primary" 
                          : "border-l-2 border-transparent"
                      )}
                    >
                      <span className="text-[11px] text-muted-foreground w-5 shrink-0 tabular-nums">
                        {index + 1}.
                      </span>
                      <span className="text-[13px] font-medium truncate flex-1">
                        {candidate.name}
                      </span>
                      {state.pendingCandidateId === candidate.id && (
                        <Loader2 size={12} className="animate-spin text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel - candidate detail */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {selectedCandidate ? (
              <CandidateDetailPanel
                candidate={selectedCandidate}
                vote={vote}
                state={state}
                onNavigate={(direction) => {
                  const currentIndex = state.candidates.findIndex(c => c.id === selectedCandidateId);
                  const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
                  if (newIndex >= 0 && newIndex < state.candidates.length) {
                    setSelectedCandidateId(state.candidates[newIndex].id);
                  }
                }}
                canNavigatePrev={state.candidates.findIndex(c => c.id === selectedCandidateId) > 0}
                canNavigateNext={state.candidates.findIndex(c => c.id === selectedCandidateId) < state.candidates.length - 1}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-[13px] p-8 text-center">
                {state.isLoading 
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : state.candidates.length === 0 
                    ? "Add a candidate to get started"
                    : "Select a candidate to view details"
                }
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {state.formError && (
          <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 shrink-0">
            <p className="text-[12px] text-destructive">{state.formError}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CandidateDetailPanel({
  candidate,
  vote,
  state,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
}: {
  candidate: VoteCandidate;
  vote: AudienceVote;
  state: ReturnType<typeof useVoteCandidatesDialog>;
  onNavigate: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
}) {
  const media = useVoteCandidateMedia({ candidate, vote });
  const isEditing = state.editingCandidateId === candidate.id;
  const currentIndex = state.candidates.findIndex(c => c.id === candidate.id);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onNavigate("prev")}
            disabled={!canNavigatePrev}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-[12px] text-muted-foreground tabular-nums px-1">
            {currentIndex + 1} / {state.candidates.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onNavigate("next")}
            disabled={!canNavigateNext}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        
        {!state.isLocked && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[12px] text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => state.deleteCandidate(candidate)}
            disabled={state.isDeleting}
          >
            {state.pendingCandidateId === candidate.id && state.isDeleting ? (
              <Loader2 size={12} className="animate-spin mr-1" />
            ) : (
              <Trash2 size={12} className="mr-1" />
            )}
            Delete
          </Button>
        )}
      </div>

      {/* Candidate info section */}
      <div className="space-y-4">
        {isEditing ? (
          <form onSubmit={state.handleEditSubmit} className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/30">
            <div>
              <Label className="text-[12px] text-muted-foreground">Name</Label>
              <Input
                value={state.editDraft.name}
                onChange={(e) => state.updateEditDraft("name", e.target.value)}
                className="mt-1 h-9"
                disabled={state.isEditing}
              />
              {state.editErrors.name && (
                <p className="text-[11px] text-destructive mt-1">{state.editErrors.name}</p>
              )}
            </div>
            <div>
              <Label className="text-[12px] text-muted-foreground">Description (optional)</Label>
              <Textarea
                value={state.editDraft.description}
                onChange={(e) => state.updateEditDraft("description", e.target.value)}
                className="mt-1 min-h-[60px] text-[13px]"
                disabled={state.isEditing}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={state.isEditing}>
                {state.isEditing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                Save Changes
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-[12px]" onClick={state.cancelEditing}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">{candidate.name}</h3>
              {candidate.description ? (
                <p className="text-[13px] text-muted-foreground mt-1">{candidate.description}</p>
              ) : (
                <p className="text-[13px] text-muted-foreground/50 mt-1 italic">No description</p>
              )}
            </div>
            {!state.isLocked && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px] shrink-0"
                onClick={() => state.startEditing(candidate)}
              >
                <Pencil size={12} className="mr-1" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Media section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Media</h4>
          <span className="text-[12px] text-muted-foreground">
            {media.activeMedia.length} {media.activeMedia.length === 1 ? "file" : "files"}
          </span>
        </div>

        {/* Media grid */}
        {media.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.activeMedia.map((item) => (
              <div 
                key={item.id} 
                className="relative group aspect-square rounded-lg overflow-hidden bg-muted border border-border/50"
              >
                {item.type === "video" ? (
                  <video 
                    src={item.url} 
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <Image
                    src={item.url}
                    alt={candidate.name}
                    fill
                    className="object-cover"
                  />
                )}
                {media.canSoftDelete && (
                  <button
                    type="button"
                    onClick={() => media.softDeleteMedia(item)}
                    disabled={media.isDeleting}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X size={12} />
                  </button>
                )}
                {item.type === "video" && (
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-white">
                    Video
                  </div>
                )}
              </div>
            ))}

            {/* Upload placeholder */}
            {!media.isClosed && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5">
                <input
                  key={media.fileInputKey}
                  type="file"
                  accept={VOTE_CANDIDATE_MEDIA_ACCEPT}
                  onChange={media.handleFileChange}
                  className="sr-only"
                />
                <ImagePlus size={20} className="text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Add media</span>
              </label>
            )}
          </div>
        )}

        {/* Upload UI when file selected */}
        {media.file && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{media.file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(media.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            
            {media.activeMedia.length > 0 && (
              <Select 
                value={media.replaceMediaSelectValue} 
                onValueChange={media.handleReplaceMediaChange}
              >
                <SelectTrigger className="w-28 h-8 text-[12px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={addNewMediaSelectValue}>Add new</SelectItem>
                  {media.activeMedia.map((item, idx) => (
                    <SelectItem key={item.id} value={item.id}>
                      Replace #{idx + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button
              size="sm"
              className="h-8 text-[12px]"
              onClick={media.uploadSelectedFile}
              disabled={media.isUploading}
            >
              {media.isUploading ? (
                <>
                  <Loader2 size={12} className="animate-spin mr-1" />
                  {media.uploadProgress !== null ? `${Math.round(media.uploadProgress)}%` : "..."}
                </>
              ) : (
                <>
                  <Upload size={12} className="mr-1" />
                  Upload
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={media.resetFileInput}
            >
              <X size={14} />
            </Button>
          </div>
        )}

        {/* Error/success messages */}
        {media.formError && (
          <p className="text-[12px] text-destructive">{media.formError}</p>
        )}
        {media.successMessage && (
          <p className="text-[12px] text-green-600">{media.successMessage}</p>
        )}

        {/* Archived media toggle */}
        {media.archivedMedia.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <button
              type="button"
              onClick={() => media.setShowArchived(!media.showArchived)}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {media.showArchived ? "Hide" : "Show"} archived ({media.archivedMedia.length})
            </button>
            
            {media.showArchived && (
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                {media.archivedMedia.map((item) => (
                  <div 
                    key={item.id} 
                    className="relative aspect-square rounded-md overflow-hidden bg-muted border border-border/30 opacity-50"
                  >
                    {item.type === "video" ? (
                      <video src={item.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <Image
                        src={item.url}
                        alt={candidate.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
