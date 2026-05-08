"use client";

import type { ChangeEventHandler } from "react";
import { FileUp, Loader2 } from "lucide-react";

import {
  VOTE_CANDIDATE_MEDIA_ACCEPT,
  type VoteCandidate,
  type VoteCandidateMedia,
  type VoteCandidateMediaId,
} from "@/entities/audience-vote";
import { Button } from "@/shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
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
import { formatVoteCandidateMediaFileSize } from "../model/vote-candidate-media";

export function VoteCandidateMediaUploadForm({
  activeMedia,
  candidate,
  file,
  fileInputKey,
  isUploading,
  onFileChange,
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
  onReplaceMediaChange: (value: string) => void;
  onUpload: () => void;
  replaceMediaSelectValue: VoteCandidateMediaId | typeof addNewMediaSelectValue;
  uploadProgress: number | null;
}) {
  const inputId = `media-file-${candidate.id}`;
  const isUploadModeDisabled = isUploading || activeMedia.length === 0;

  return (
    <FieldSet className="gap-3 rounded-md border border-border/70 bg-background p-3">
      <FieldGroup className="gap-3">
        <Field data-disabled={isUploading ? true : undefined}>
          <FieldLabel htmlFor={inputId}>Media file</FieldLabel>
          <Input
            accept={VOTE_CANDIDATE_MEDIA_ACCEPT}
            disabled={isUploading}
            id={inputId}
            key={fileInputKey}
            onChange={onFileChange}
            type="file"
          />
          <FieldDescription>
            {file
              ? `Selected: ${file.name} / ${formatVoteCandidateMediaFileSize(file.size)}`
              : "JPG, PNG, WebP, HEIC, MP4, MOV, or WebM."}
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
      {uploadProgress !== null ? <Progress value={uploadProgress} /> : null}
    </FieldSet>
  );
}
