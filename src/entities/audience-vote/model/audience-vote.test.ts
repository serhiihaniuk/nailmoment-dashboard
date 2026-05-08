import { describe, expect, test } from "vitest";

import {
  parseAudienceVote,
  parseAudienceVoteList,
} from "./audience-vote";

function makeAudienceVoteResponse(overrides: Record<string, unknown> = {}) {
  return {
    archived: false,
    created_at: "2026-05-08T10:00:00.000Z",
    id: "vote_1",
    kind: "speaker",
    status: "draft",
    title: "Speaker vote",
    updated_at: "2026-05-08T10:00:00.000Z",
    window_end: null,
    window_start: null,
    ...overrides,
  };
}

describe("audience vote parsing", () => {
  test("parses browser responses and preserves nullable windows", () => {
    const vote = parseAudienceVote(
      makeAudienceVoteResponse({
        window_start: "2026-05-08T12:00:00.000Z",
      })
    );

    expect(vote.created_at).toBeInstanceOf(Date);
    expect(vote.window_start).toBeInstanceOf(Date);
    expect(vote.window_end).toBeNull();
  });

  test("parses lists and rejects unknown workflow values", () => {
    expect(parseAudienceVoteList([makeAudienceVoteResponse()])).toHaveLength(1);

    expect(() =>
      parseAudienceVote(makeAudienceVoteResponse({ kind: "legacy_speaker" }))
    ).toThrow();
    expect(() =>
      parseAudienceVote(makeAudienceVoteResponse({ status: "published" }))
    ).toThrow();
  });
});

