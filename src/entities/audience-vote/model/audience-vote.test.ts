import { describe, expect, test } from "vitest";

import {
  parsePublicVoteCandidate,
  parseAudienceVote,
  parseAudienceVoteList,
  parseVoteCandidate,
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

function makeVoteCandidateResponse(overrides: Record<string, unknown> = {}) {
  return {
    archived: false,
    audience_vote_id: "vote_1",
    caption: "Public caption",
    created_at: "2026-05-08T10:00:00.000Z",
    display_name: "Speaker A",
    display_order: 1,
    id: "candidate_1",
    internal_name: "Real speaker name",
    updated_at: "2026-05-08T10:00:00.000Z",
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

  test("parses Operator Vote Candidate responses", () => {
    const candidate = parseVoteCandidate(makeVoteCandidateResponse());

    expect(candidate.created_at).toBeInstanceOf(Date);
    expect(candidate.internal_name).toBe("Real speaker name");
    expect(candidate.display_order).toBe(1);
  });

  test("strips internal names from the Mini App candidate contract", () => {
    const candidate = parsePublicVoteCandidate(makeVoteCandidateResponse());

    expect(candidate).toEqual({
      caption: "Public caption",
      display_name: "Speaker A",
      display_order: 1,
      id: "candidate_1",
    });
    expect("internal_name" in candidate).toBe(false);
  });
});

