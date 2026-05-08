import { z } from "zod";

export type AudienceVoteLifecycleApiError = z.infer<
  typeof audienceVoteLifecycleApiErrorSchema
>;

const audienceVoteLifecycleIssueSchema = z.object({
  candidateId: z.string().optional(),
  code: z.string(),
  message: z.string(),
});

const audienceVoteLifecycleApiErrorSchema = z.object({
  issues: z.array(audienceVoteLifecycleIssueSchema).optional(),
  message: z.string(),
});

export function parseAudienceVoteLifecycleApiError(
  value: unknown
): AudienceVoteLifecycleApiError {
  const parsed = audienceVoteLifecycleApiErrorSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : { message: "Could not update Audience Vote." };
}

export function formatAudienceVoteLifecycleApiError(
  error: AudienceVoteLifecycleApiError
): string {
  if (!error.issues || error.issues.length === 0) {
    return error.message;
  }

  return [error.message, ...error.issues.map((issue) => issue.message)].join(
    " "
  );
}
