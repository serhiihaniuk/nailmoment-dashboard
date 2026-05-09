import { z } from "zod";

import { readTelegramAudienceVoteOperatorTelegramIds } from "@/shared/config/env";

const operatorTelegramUserIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

const operatorTelegramUserIdsSchema = z
  .string()
  .transform((value) => value.split(/[\s,]+/).filter(Boolean))
  .pipe(z.array(operatorTelegramUserIdSchema).min(1))
  .transform((ids) => [...new Set(ids)]);

export function readAudienceVoteBroadcastOperatorTelegramUserIds() {
  return operatorTelegramUserIdsSchema.parse(
    readTelegramAudienceVoteOperatorTelegramIds()
  );
}
