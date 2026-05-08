import { describe, expect, test } from "vitest";

import { buildAudienceVoteCurrentVoteInsertSelectFields } from "./audience-vote-service";

describe("audience vote service", () => {
  test("selects current-vote insert fields in table order for Drizzle insert-select", () => {
    const fields = buildAudienceVoteCurrentVoteInsertSelectFields({
      candidateId: "candidate_1",
      currentVoteId: "vote_row_1",
      telegramUserId: 299445418,
    });

    expect(Object.keys(fields)).toEqual([
      "id",
      "audience_vote_id",
      "candidate_id",
      "telegram_user_id",
      "created_at",
      "updated_at",
    ]);
  });
});
