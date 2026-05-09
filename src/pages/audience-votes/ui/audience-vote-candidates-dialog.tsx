"use client";

import { useState } from "react";
import { 
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
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
import { cn } from "@/shared/lib/cn";

import type { AudienceVote, VoteCandidate, VoteCandidateMedia } from "@/entities/audience-vote";
import { VOTE_CANDIDATE_MEDIA_ACCEPT } from "@/entities/audience-vote";
import { formatAudienceVoteStatus } from "../model/audience-vote-form";
import { useVoteCandidatesDialog } from "../model/use-vote-candidates-dialog";
import { useVoteCandidateMedia, addNewMediaSelectValue } from "../model/use-vote-candidate-media";
import { canBrowserPreviewVoteCandidateMedia } from "../model/vote-candidate-media";
import { VoteCandidateDeleteDialog } from "./vote-candidate-delete-dialog";

export function AudienceVoteCandidatesDialog({ vote }: { vote: AudienceVote }) {
  const state = useVoteCandidatesDialog(vote);
  const [selectedCandidateId, setSelectedCandidateId] = useState<
    VoteCandidate["id"] | null
  >(null);
  const [candidateToDelete, setCandidateToDelete] =
    useState<VoteCandidate | null>(null);

  const firstCandidate = state.candidates[0] ?? null;
  const selectedCandidate =
    state.candidates.find((candidate) => candidate.id === selectedCandidateId) ??
    firstCandidate;
  
  const handleOpenChange = (open: boolean) => {
    state.handleOpenChange(open);
    if (!open) {
      setSelectedCandidateId(null);
      setCandidateToDelete(null);
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <VoteCandidateDeleteDialog
        candidate={candidateToDelete}
        disabled={state.isPending}
        onConfirm={(candidate) => {
          state.deleteCandidate(candidate);
          setCandidateToDelete(null);
        }}
        onOpenChange={(open) => {
          if (!open) setCandidateToDelete(null);
        }}
      />
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
          <Users size={14} />
          Кандидати
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] sm:max-h-[90vh] overflow-hidden w-[95vw] sm:w-[90vw] sm:max-w-5xl lg:max-w-6xl p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border/50 bg-muted/30 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg">
                Керування кандидатами
              </DialogTitle>
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
                <span className="font-medium text-foreground">
                  {state.candidates.length}
                </span>{" "}
                кандидатів
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
                    placeholder="Ім’я кандидата..."
                    value={state.draft.display_name}
                    onChange={(e) => state.updateDraft("display_name", e.target.value)}
                    className="h-8 text-[13px]"
                    disabled={state.isCreating}
                  />
                  {state.errors.display_name && (
                    <p className="text-[11px] text-destructive">{state.errors.display_name}</p>
                  )}
                  <Input
                    placeholder="Внутрішня назва (необов’язково)"
                    value={state.draft.internal_name}
                    onChange={(e) => state.updateDraft("internal_name", e.target.value)}
                    className="h-8 text-[13px]"
                    disabled={state.isCreating}
                  />
                  {state.errors.internal_name && (
                    <p className="text-[11px] text-destructive">{state.errors.internal_name}</p>
                  )}
                  <Textarea
                    placeholder="Підпис (необов’язково)"
                    value={state.draft.caption}
                    onChange={(e) => state.updateDraft("caption", e.target.value)}
                    className="min-h-15 text-[13px]"
                    disabled={state.isCreating}
                    rows={2}
                  />
                  {state.errors.caption && (
                    <p className="text-[11px] text-destructive">{state.errors.caption}</p>
                  )}
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="w-full h-7 text-[12px]"
                    disabled={state.isCreating || !state.draft.display_name.trim()}
                  >
                    {state.isCreating ? (
                      <Loader2 size={12} className="animate-spin mr-1" />
                    ) : (
                      <Plus size={12} className="mr-1" />
                    )}
                    Додати кандидата
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
              ) : state.isQueryError ? (
                <div className="p-4 text-center text-[13px] text-destructive">
                  Не вдалося завантажити кандидатів: {state.queryError?.message}
                </div>
              ) : state.candidates.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-muted-foreground">
                  Кандидатів ще немає
                </div>
              ) : (
                <div className="py-1">
                  {state.candidates.map((candidate, candidateIndex) => (
                    <div
                      key={candidate.id}
                      className={cn(
                        "w-full px-3 py-2.5 flex items-center gap-2 transition-colors",
                        "hover:bg-muted/60",
                        selectedCandidate?.id === candidate.id
                          ? "bg-muted/80 border-l-2 border-primary" 
                          : "border-l-2 border-transparent"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        className="min-w-0 flex flex-1 items-center gap-2 text-left"
                      >
                        <span className="text-[11px] text-muted-foreground w-5 shrink-0 tabular-nums">
                          {candidate.display_order}.
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {candidate.display_name}
                          </span>
                          {candidate.internal_name ? (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {candidate.internal_name}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {state.pendingCandidateId === candidate.id && (
                        <Loader2 size={12} className="animate-spin text-muted-foreground shrink-0" />
                      )}
                      {!state.isLocked && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => state.moveCandidate(candidate, candidate.display_order - 1)}
                            disabled={state.isPending || candidateIndex <= 0}
                            aria-label="Move candidate up"
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => state.moveCandidate(candidate, candidate.display_order + 1)}
                            disabled={state.isPending || candidateIndex >= state.candidates.length - 1}
                            aria-label="Move candidate down"
                          >
                            <ArrowDown size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
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
                  const currentIndex = state.candidates.findIndex(c => c.id === selectedCandidate.id);
                  const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
                  const nextCandidate = state.candidates[newIndex];
                  if (newIndex >= 0 && newIndex < state.candidates.length && nextCandidate) {
                    setSelectedCandidateId(nextCandidate.id);
                  }
                }}
                canNavigatePrev={state.candidates.findIndex(c => c.id === selectedCandidate.id) > 0}
                canNavigateNext={state.candidates.findIndex(c => c.id === selectedCandidate.id) < state.candidates.length - 1}
                onRequestDelete={setCandidateToDelete}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-[13px] p-8 text-center">
                {state.isLoading 
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : state.isQueryError
                    ? "Не вдалося завантажити кандидатів"
                  : state.candidates.length === 0 
                    ? "Додайте кандидата, щоб почати"
                    : "Оберіть кандидата, щоб переглянути деталі"
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
  onRequestDelete,
  canNavigatePrev,
  canNavigateNext,
}: {
  candidate: VoteCandidate;
  vote: AudienceVote;
  state: ReturnType<typeof useVoteCandidatesDialog>;
  onNavigate: (direction: "prev" | "next") => void;
  onRequestDelete: (candidate: VoteCandidate) => void;
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
        <div className="flex flex-wrap items-center gap-1">
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
      </div>

      {/* Candidate info section */}
      <div className="space-y-4">
        {isEditing ? (
          <form onSubmit={state.handleEditSubmit} className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/30">
            <div>
              <Label className="text-[12px] text-muted-foreground">
                Публічна назва
              </Label>
              <Input
                value={state.editDraft.display_name}
                onChange={(e) => state.updateEditDraft("display_name", e.target.value)}
                className="mt-1 h-9"
                disabled={state.isEditing}
              />
              {state.editErrors.display_name && (
                <p className="text-[11px] text-destructive mt-1">{state.editErrors.display_name}</p>
              )}
            </div>
            <div>
              <Label className="text-[12px] text-muted-foreground">
                Внутрішня назва (необов’язково)
              </Label>
              <Input
                value={state.editDraft.internal_name}
                onChange={(e) => state.updateEditDraft("internal_name", e.target.value)}
                className="mt-1 h-9"
                disabled={state.isEditing}
              />
              {state.editErrors.internal_name && (
                <p className="text-[11px] text-destructive mt-1">{state.editErrors.internal_name}</p>
              )}
            </div>
            <div>
              <Label className="text-[12px] text-muted-foreground">
                Підпис (необов’язково)
              </Label>
              <Textarea
                value={state.editDraft.caption}
                onChange={(e) => state.updateEditDraft("caption", e.target.value)}
                className="mt-1 min-h-15 text-[13px]"
                disabled={state.isEditing}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={state.isEditing}>
                  {state.isEditing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                Зберегти зміни
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-[12px]" onClick={state.cancelEditing}>
                Скасувати
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[12px] text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRequestDelete(candidate)}
                disabled={state.isDeleting}
                type="button"
              >
                {state.pendingCandidateId === candidate.id && state.isDeleting ? (
                  <Loader2 size={12} className="animate-spin mr-1" />
                ) : (
                  <Trash2 size={12} className="mr-1" />
                )}
                Видалити
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">{candidate.display_name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span>Порядок {candidate.display_order}</span>
                {candidate.internal_name ? (
                  <>
                    <span className="text-border">&middot;</span>
                    <span>{candidate.internal_name}</span>
                  </>
                ) : null}
              </div>
              {candidate.caption ? (
                <p className="text-[13px] text-muted-foreground mt-1">{candidate.caption}</p>
              ) : (
                <p className="text-[13px] text-muted-foreground/50 mt-1 italic">
                  Без підпису
                </p>
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
                Редагувати
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Media section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Медіа</h4>
          <span className="text-[12px] text-muted-foreground">
            {media.activeMedia.length}{" "}
            {media.activeMedia.length === 1 ? "файл" : "файлів"}
          </span>
        </div>

        {/* Media grid */}
        {media.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.activeMedia.map((item, index) => (
              <div 
                key={item.id} 
                className="relative group aspect-square rounded-lg overflow-hidden bg-muted border border-border/50"
              >
                <CandidateMediaPreview
                  alt={candidate.display_name}
                  media={item}
                />
                {media.canSoftDelete && (
                  <>
                    <div className="absolute left-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          media.moveMedia(item, item.display_order - 1)
                        }
                        disabled={media.isReordering || index === 0}
                        className="rounded-md bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Перемістити медіа вище"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          media.moveMedia(item, item.display_order + 1)
                        }
                        disabled={
                          media.isReordering ||
                          index === media.activeMedia.length - 1
                        }
                        className="rounded-md bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Перемістити медіа нижче"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          disabled={media.isDeleting}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          aria-label="Видалити медіа"
                        >
                          {media.pendingMediaId === item.id &&
                          (media.isDeleting || media.isReordering) ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Видалити медіа?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Це медіа буде приховано з активного списку кандидата.
                            Дію можна виконувати лише до відкриття голосування.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={media.isDeleting}>
                            Скасувати
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={media.isDeleting}
                            onClick={() => media.softDeleteMedia(item)}
                          >
                            Видалити
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                {item.media_type === "video" && (
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-white">
                    Відео
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
                <span className="text-[11px] text-muted-foreground">
                  Додати медіа
                </span>
              </label>
            )}
          </div>
        )}

        {/* Upload UI when file selected */}
        {media.file && media.shouldShowManualUpload && (
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
                  <SelectValue placeholder="Дія" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={addNewMediaSelectValue}>
                    Додати нове
                  </SelectItem>
                  {media.activeMedia.map((item, idx) => (
                    <SelectItem key={item.id} value={item.id}>
                      Замінити #{idx + 1}
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
                  Завантажити
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
              {media.showArchived ? "Сховати" : "Показати"} архів (
              {media.archivedMedia.length})
            </button>
            
            {media.showArchived && (
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                {media.archivedMedia.map((item) => (
                  <div 
                    key={item.id} 
                    className="relative aspect-square rounded-md overflow-hidden bg-muted border border-border/30 opacity-50"
                  >
                    <CandidateMediaPreview
                      alt={candidate.display_name}
                      media={item}
                    />
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

function CandidateMediaPreview({
  alt,
  media,
}: {
  alt: string;
  media: VoteCandidateMedia;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const canPreview =
    !previewFailed &&
    canBrowserPreviewVoteCandidateMedia({
      contentType: media.content_type,
      mediaType: media.media_type,
    });

  if (!canPreview) {
    return <CandidateMediaPreviewFallback media={media} />;
  }

  if (media.media_type === "video") {
    return (
      <video
        className="h-full w-full object-cover"
        muted
        onError={() => setPreviewFailed(true)}
        preload="metadata"
      >
        <source src={media.blob_url} type={media.content_type} />
      </video>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setPreviewFailed(true)}
      src={media.blob_url}
    />
  );
}

function CandidateMediaPreviewFallback({
  media,
}: {
  media: VoteCandidateMedia;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/50 p-3 text-center">
      <ImageOff size={22} className="text-muted-foreground" />
      <p className="text-[11px] leading-snug text-muted-foreground">
        Preview unavailable
      </p>
      <a
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        href={media.blob_url}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink size={12} />
        Open file
      </a>
    </div>
  );
}
