"use client";

import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field";
import type {
  VoteCandidateDraft,
  VoteCandidateFieldErrors,
} from "../model/vote-candidate-form";

export function VoteCandidateFields({
  disabled,
  draft,
  errors,
  onChange,
}: {
  disabled: boolean;
  draft: VoteCandidateDraft;
  errors: VoteCandidateFieldErrors;
  onChange: <FieldName extends keyof VoteCandidateDraft>(
    field: FieldName,
    value: VoteCandidateDraft[FieldName]
  ) => void;
}) {
  return (
    <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
      <Field data-invalid={Boolean(errors.display_name)}>
        <FieldLabel htmlFor="vote-candidate-display-name">
          Public display name
        </FieldLabel>
        <Input
          aria-invalid={Boolean(errors.display_name)}
          disabled={disabled}
          id="vote-candidate-display-name"
          onChange={(event) => onChange("display_name", event.target.value)}
          placeholder="Anonymous finalist 1"
          value={draft.display_name}
        />
        <FieldError>{errors.display_name}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors.internal_name)}>
        <FieldLabel htmlFor="vote-candidate-internal-name">
          Internal name
        </FieldLabel>
        <Input
          aria-invalid={Boolean(errors.internal_name)}
          disabled={disabled}
          id="vote-candidate-internal-name"
          onChange={(event) => onChange("internal_name", event.target.value)}
          placeholder="Operator note or real name"
          value={draft.internal_name}
        />
        <FieldError>{errors.internal_name}</FieldError>
      </Field>
      <Field
        className="sm:col-span-2"
        data-invalid={Boolean(errors.caption)}
      >
        <FieldLabel htmlFor="vote-candidate-caption">
          Public caption
        </FieldLabel>
        <Textarea
          aria-invalid={Boolean(errors.caption)}
          disabled={disabled}
          id="vote-candidate-caption"
          maxRows={4}
          onChange={(event) => onChange("caption", event.target.value)}
          placeholder="Shown in the Mini App"
          value={draft.caption}
        />
        <FieldError>{errors.caption}</FieldError>
      </Field>
    </FieldGroup>
  );
}
