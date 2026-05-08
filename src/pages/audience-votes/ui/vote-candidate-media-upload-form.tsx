"use client";

import {
  type ChangeEventHandler,
  type DragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FileImage,
  FileUp,
  FileVideo,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  VOTE_CANDIDATE_MEDIA_ACCEPT,
  type VoteCandidate,
  type VoteCandidateMedia,
  type VoteCandidateMediaId,
} from "@/entities/audience-vote";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { addNewMediaSelectValue } from "../model/use-vote-candidate-media";
import {
  canBrowserPreviewVoteCandidateMedia,
  formatVoteCandidateMediaFileSize,
  formatVoteCandidateMediaType,
  resolveVoteCandidateMediaFile,
} from "../model/vote-candidate-media";

export function VoteCandidateMediaUploadForm({
  activeMedia,
  candidate,
  file,
  fileInputKey,
  isUploading,
  onFileChange,
  onFileSelect,
  onReplaceMediaChange,
  onUpload,
  replaceMediaSelectValue,
  uploadProgress,
}: {
  activeMedia: VoteCandidateMedia[];
  candidate: VoteCandidate;
  file: File | null;
  fileInputKey: number;
  isUploading: boolean;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onFileSelect: (file: File | null) => void;
  onReplaceMediaChange: (value: string) => void;
  onUpload: () => void;
  replaceMediaSelectValue: VoteCandidateMediaId | typeof addNewMediaSelectValue;
  uploadProgress: number | null;
}) {
  const inputId = `media-file-${candidate.id}`;
  const isUploadModeDisabled = isUploading || activeMedia.length === 0;
  const [isDragging, setIsDragging] = useState(false);
  const resolvedFile = file ? resolveVoteCandidateMediaFile(file) : null;
  const previewUrl = useMemo(() => {
    if (!file) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!isUploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    const relatedTarget = event.relatedTarget;

    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }

    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (isUploading) {
      return;
    }

    onFileSelect(event.dataTransfer.files.item(0));
  }

  return (
    <FieldSet className="gap-4 rounded-lg border border-border/70 bg-background p-4">
      <div>
        <FieldLegend className="mb-1">Upload media</FieldLegend>
        <p className="text-sm text-muted-foreground">
          Add photos or videos for {candidate.display_name}.
        </p>
      </div>

      <FieldGroup className="gap-4">
        <Field data-disabled={isUploading ? true : undefined}>
          <FieldLabel htmlFor={inputId}>Media file</FieldLabel>
          <label
            className={cn(
              "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center transition-colors",
              "hover:bg-muted/40",
              isDragging && "border-primary bg-primary/5",
              isUploading && "cursor-not-allowed opacity-60"
            )}
            htmlFor={inputId}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Input
              accept={VOTE_CANDIDATE_MEDIA_ACCEPT}
              className="sr-only"
              disabled={isUploading}
              id={inputId}
              key={fileInputKey}
              onChange={onFileChange}
              type="file"
            />
            {file && resolvedFile?.ok ? (
              <SelectedFilePreview
                file={file}
                mediaType={resolvedFile.mediaType}
                onClear={() => onFileSelect(null)}
                previewUrl={previewUrl}
              />
            ) : (
              <div className="grid justify-items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                  <UploadCloud aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Choose a file</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, WebP, HEIC, MP4, MOV, or WebM
                  </p>
                </div>
              </div>
            )}
          </label>
          <FieldDescription>
            {file
              ? `${file.name} / ${formatVoteCandidateMediaFileSize(file.size)}`
              : "Photos up to 20 MB. Videos up to 100 MB."}
          </FieldDescription>
        </Field>
        <FieldGroup className="gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field data-disabled={isUploadModeDisabled ? true : undefined}>
            <FieldLabel>Upload mode</FieldLabel>
            <Select
              disabled={isUploadModeDisabled}
              onValueChange={onReplaceMediaChange}
              value={replaceMediaSelectValue}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={addNewMediaSelectValue}>
                    Add as new media
                  </SelectItem>
                  {activeMedia.map((media) => (
                    <SelectItem key={media.id} value={media.id}>
                      Replace #{media.display_order} {media.file_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Button
            className="w-full sm:w-auto"
            disabled={!file || isUploading}
            onClick={onUpload}
            type="button"
          >
            {isUploading ? (
              <Loader2
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <FileUp aria-hidden="true" data-icon="inline-start" />
            )}
            Upload
          </Button>
        </FieldGroup>
      </FieldGroup>
      {uploadProgress !== null ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Uploading</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      ) : null}
    </FieldSet>
  );
}

function SelectedFilePreview({
  file,
  mediaType,
  onClear,
  previewUrl,
}: {
  file: File;
  mediaType: "photo" | "video";
  onClear: () => void;
  previewUrl: string | null;
}) {
  const canPreview =
    previewUrl &&
    canBrowserPreviewVoteCandidateMedia({
      contentType: file.type,
      mediaType,
    });

  return (
    <div className="grid w-full gap-3">
      <div className="flex items-center justify-between gap-3 text-left">
        <Badge className="rounded-md" variant="secondary">
          {formatVoteCandidateMediaType(mediaType)}
        </Badge>
        <Button
          aria-label="Clear selected file"
          onClick={(event) => {
            event.preventDefault();
            onClear();
          }}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      {canPreview ? (
        <div className="mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-md bg-muted">
          {mediaType === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={file.name}
              className="size-full object-contain"
              src={previewUrl}
            />
          ) : (
            <video
              className="size-full bg-black object-contain"
              controls
              preload="metadata"
            >
              <source src={previewUrl} type={file.type} />
            </video>
          )}
        </div>
      ) : (
        <div className="grid justify-items-center gap-2 rounded-md border border-border/70 bg-background p-4">
          {mediaType === "photo" ? (
            <FileImage aria-hidden="true" className="size-6" />
          ) : (
            <FileVideo aria-hidden="true" className="size-6" />
          )}
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            This file can be uploaded, but this browser may not preview it.
          </p>
        </div>
      )}
    </div>
  );
}
