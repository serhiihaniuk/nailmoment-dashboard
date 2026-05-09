import { z } from "zod";

import {
  defaultAudienceVoteBotSettings,
  type AudienceVoteBotSettings,
} from "@/entities/audience-vote";
import {
  updateAudienceVoteBotSettingsClientSchema,
  type UpdateAudienceVoteBotSettingsClientOutput,
} from "@/shared/db/schema.zod";

export type AudienceVoteBotSettingsFormDraft = {
  start_button_text: string;
  start_message: string;
};

export type AudienceVoteBotSettingsFormValues =
  UpdateAudienceVoteBotSettingsClientOutput;

export type AudienceVoteBotSettingsFieldErrors = Partial<
  Record<keyof AudienceVoteBotSettingsFormDraft, string>
>;

export type AudienceVoteBotSettingsApiError = {
  code?: "missing_database_table" | undefined;
  errors?: Record<string, string[] | undefined> | undefined;
  message: string;
};

type ParseBotSettingsDraftResult =
  | { data: AudienceVoteBotSettingsFormValues; ok: true }
  | { errors: AudienceVoteBotSettingsFieldErrors; ok: false };

const audienceVoteBotSettingsApiErrorSchema = z.object({
  code: z.literal("missing_database_table").optional(),
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string(),
});

export const audienceVoteBotSettingsQueryKey = [
  "audienceVoteBotSettings",
] as const;

export function createAudienceVoteBotSettingsDraft(
  botSettings?: Pick<
    AudienceVoteBotSettings,
    "start_button_text" | "start_message"
  >
): AudienceVoteBotSettingsFormDraft {
  return {
    start_button_text:
      botSettings?.start_button_text ??
      defaultAudienceVoteBotSettings.start_button_text,
    start_message:
      botSettings?.start_message ??
      defaultAudienceVoteBotSettings.start_message,
  };
}

export function parseAudienceVoteBotSettingsDraft(
  draft: AudienceVoteBotSettingsFormDraft
): ParseBotSettingsDraftResult {
  const parsed = updateAudienceVoteBotSettingsClientSchema.safeParse(draft);

  if (parsed.success) {
    return { data: parsed.data, ok: true };
  }

  return {
    errors: mapAudienceVoteBotSettingsIssues(parsed.error.issues),
    ok: false,
  };
}

export function parseAudienceVoteBotSettingsApiError(
  value: unknown
): AudienceVoteBotSettingsApiError {
  const parsed = audienceVoteBotSettingsApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Не вдалося оновити повідомлення /start." };
}

export function mapAudienceVoteBotSettingsApiErrors(
  error: AudienceVoteBotSettingsApiError
): AudienceVoteBotSettingsFieldErrors {
  if (!error.errors) {
    return {};
  }

  return Object.entries(error.errors).reduce<AudienceVoteBotSettingsFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message && isAudienceVoteBotSettingsField(fieldName)) {
        acc[fieldName] = message;
      }

      return acc;
    },
    {}
  );
}

function mapAudienceVoteBotSettingsIssues(
  issues: z.ZodIssue[]
): AudienceVoteBotSettingsFieldErrors {
  return issues.reduce<AudienceVoteBotSettingsFieldErrors>((acc, issue) => {
    const fieldName = issue.path[0];

    if (
      typeof fieldName === "string" &&
      isAudienceVoteBotSettingsField(fieldName)
    ) {
      acc[fieldName] = issue.message;
    }

    return acc;
  }, {});
}

function isAudienceVoteBotSettingsField(
  value: string
): value is keyof AudienceVoteBotSettingsFormDraft {
  return value === "start_button_text" || value === "start_message";
}
