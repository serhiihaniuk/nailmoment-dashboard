"use client";

import type { FormEvent } from "react";
import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type {
  VoteCandidateDraft,
  VoteCandidateFieldErrors,
} from "../model/vote-candidate-form";
import { VoteCandidateFields } from "./vote-candidate-fields";

export function VoteCandidateEditForm({
  draft,
  errors,
  isPending,
  isRowPending,
  onCancel,
  onSubmit,
  onUpdateDraft,
}: {
  draft: VoteCandidateDraft;
  errors: VoteCandidateFieldErrors;
  isPending: boolean;
  isRowPending: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateDraft: <FieldName extends keyof VoteCandidateDraft>(
    field: FieldName,
    value: VoteCandidateDraft[FieldName]
  ) => void;
}) {
  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <VoteCandidateFields
        disabled={isPending}
        draft={draft}
        errors={errors}
        onChange={onUpdateDraft}
      />
      <div className="flex justify-end gap-2">
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" data-icon="inline-start" />
          Скасувати
        </Button>
        <Button disabled={isPending} size="sm" type="submit">
          {isRowPending ? (
            <Loader2
              aria-hidden="true"
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <Save aria-hidden="true" data-icon="inline-start" />
          )}
          Зберегти
        </Button>
      </div>
    </form>
  );
}
