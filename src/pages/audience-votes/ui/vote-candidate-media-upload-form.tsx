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
  return (
    <FieldSet className="gap-3 rounded-md border border-border/70 bg-background p-3">
      <FieldGroup className="gap-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_auto] md:items-end">
        <Field>
          <FieldLabel htmlFor={`media-file-${candidate.id}`}>
            Media file
          </FieldLabel>
          <Input
            accept={VOTE_CANDIDATE_MEDIA_ACCEPT}
            disabled={isUploading}
            id={`media-file-${candidate.id}`}
            key={fileInputKey}
            onChange={onFileChange}
            type="file"
          />
          <FieldDescription>
            JPG, PNG, WebP, HEIC, MP4, MOV, or WebM.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Upload mode</FieldLabel>
          <Select
            disabled={isUploading || activeMedia.length === 0}
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
      {file ? (
        <FieldDescription>
          {file.name} / {formatVoteCandidateMediaFileSize(file.size)}
        </FieldDescription>
      ) : null}
      {uploadProgress !== null ? <Progress value={uploadProgress} /> : null}
    </FieldSet>
  );
}
