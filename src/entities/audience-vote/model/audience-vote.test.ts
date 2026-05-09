import { describe, expect, test } from "vitest";

import {
  buildVoteCandidateMediaPath,
  parseAudienceVoteBroadcast,
  parseAudienceVoteBotSettings,
  parseAudienceVoteBroadcastPreview,
  parsePublicVoteCandidate,
  parseAudienceVoteMiniAppResponse,
  parseAudienceVoteMiniAppVoteResponse,
  parseAudienceVote,
  parseAudienceVoteList,
  buildAudienceVoteResults,
  parseVoteCandidate,
  parseVoteCandidateMedia,
  validateAudienceVoteOpenReadiness,
  voteCandidateMediaUploadPayloadSchema,
} from "./audience-vote";

function makeAudienceVoteResponse(overrides: Record<string, unknown> = {}) {
  return {
    archived: false,
    created_at: "2026-05-08T10:00:00.000Z",
    id: "vote_1",
    kind: "speaker",
    opening_broadcast_include_open_button: true,
    opening_broadcast_message_text: null,
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

function makeVoteCandidateMediaResponse(
  overrides: Record<string, unknown> = {}
) {
  return {
    archived: false,
    blob_download_url: "https://example.public.blob.vercel-storage.com/file.jpg?download=1",
    blob_pathname: "audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg",
    blob_url: "https://example.public.blob.vercel-storage.com/file.jpg",
    candidate_id: "candidate_1",
    content_type: "image/jpeg",
    created_at: "2026-05-08T10:00:00.000Z",
    display_order: 1,
    file_name: "candidate.jpg",
    file_size_bytes: 1024,
    id: "media_1",
    media_type: "photo",
    updated_at: "2026-05-08T10:00:00.000Z",
    ...overrides,
  };
}

function makeAudienceVoteBroadcastResponse(
  overrides: Record<string, unknown> = {}
) {
  return {
    audience_vote_id: "vote_1",
    canary_voter_limit: 25,
    created_at: "2026-05-08T16:00:00.000Z",
    delivery_counts: {
      normal: { failed: 0, pending: 30, sent: 0, skipped: 0 },
      operator_canary: { failed: 0, pending: 0, sent: 1, skipped: 0 },
      voter_canary: { failed: 0, pending: 26, sent: 0, skipped: 0 },
    },
    estimated_recipient_count: 30,
    id: "broadcast_1",
    include_open_button: true,
    interrupted_at: null,
    message_text: "Public voting starts now",
    next_stage_at: "2026-05-08T16:02:00.000Z",
    operator_telegram_user_id: 299445418,
    status: "canary_operator_sent",
    updated_at: "2026-05-08T16:00:00.000Z",
    ...overrides,
  };
}

describe("audience vote parsing", () => {
  test("parses browser responses and preserves nullable windows", () => {
    const vote = parseAudienceVote(
      makeAudienceVoteResponse({
        opening_broadcast_message_text: "Voting starts now",
        window_start: "2026-05-08T12:00:00.000Z",
      })
    );

    expect(vote.created_at).toBeInstanceOf(Date);
    expect(vote.opening_broadcast_include_open_button).toBe(true);
    expect(vote.opening_broadcast_message_text).toBe("Voting starts now");
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

  test("parses Operator Vote Candidate Media responses", () => {
    const media = parseVoteCandidateMedia(makeVoteCandidateMediaResponse());

    expect(media.created_at).toBeInstanceOf(Date);
    expect(media.media_type).toBe("photo");
    expect(media.blob_pathname).toBe(
      "audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg"
    );
  });

  test("builds deterministic app-controlled media paths", () => {
    const payload = voteCandidateMediaUploadPayloadSchema.parse({
      audienceVoteId: "vote_1",
      candidateId: "candidate_1",
      contentType: "video/mp4",
      fileName: "Final clip.mp4",
      mediaId: "media_1",
      sizeBytes: 10 * 1024 * 1024,
    });

    expect(buildVoteCandidateMediaPath(payload)).toBe(
      "audience-votes/vote_1/candidates/candidate_1/media/media_1.mp4"
    );
  });

  test("rejects media payloads above launch size limits", () => {
    expect(() =>
      voteCandidateMediaUploadPayloadSchema.parse({
        audienceVoteId: "vote_1",
        candidateId: "candidate_1",
        contentType: "image/jpeg",
        fileName: "too-large.jpg",
        mediaId: "media_1",
        sizeBytes: 21 * 1024 * 1024,
      })
    ).toThrow("Фото має бути до 20 MB");
  });

  test("validates the ready-to-open ballot rules", () => {
    const issues = validateAudienceVoteOpenReadiness({
      activeCandidates: [
        { display_name: "Speaker A", id: "candidate_1" },
        { display_name: "Speaker B", id: "candidate_2" },
      ],
      activeMediaCountsByCandidateId: new Map([
        ["candidate_1", 1],
        ["candidate_2", 1],
      ]),
      otherOpenVote: null,
      vote: {
        id: "vote_1",
        kind: "speaker",
        status: "draft",
        title: "Speaker vote",
      },
    });

    expect(issues).toEqual([]);
  });

  test("reports all blockers before opening a ballot", () => {
    const issues = validateAudienceVoteOpenReadiness({
      activeCandidates: [{ display_name: "Speaker A", id: "candidate_1" }],
      activeMediaCountsByCandidateId: new Map(),
      otherOpenVote: { id: "vote_2", title: "Battle vote" },
      vote: {
        id: "vote_1",
        kind: "speaker",
        status: "scheduled",
        title: " ",
      },
    });

    expect(issues.map((issue) => issue.code)).toEqual([
      "missing_title",
      "another_vote_open",
      "not_enough_candidates",
      "missing_candidate_media",
    ]);
  });

  test("treats closed ballots as final", () => {
    const issues = validateAudienceVoteOpenReadiness({
      activeCandidates: [
        { display_name: "Speaker A", id: "candidate_1" },
        { display_name: "Speaker B", id: "candidate_2" },
      ],
      activeMediaCountsByCandidateId: new Map([
        ["candidate_1", 1],
        ["candidate_2", 1],
      ]),
      otherOpenVote: null,
      vote: {
        id: "vote_1",
        kind: "speaker",
        status: "closed",
        title: "Speaker vote",
      },
    });

    expect(issues.map((issue) => issue.code)).toContain("closed_final");
  });

  test("builds Operator aggregate results without exposing voters", () => {
    const results = buildAudienceVoteResults({
      audienceVoteId: "vote_1",
      candidates: [
        {
          display_name: "Speaker A",
          display_order: 1,
          id: "candidate_1",
          internal_name: "Real speaker A",
        },
        {
          display_name: "Speaker B",
          display_order: 2,
          id: "candidate_2",
          internal_name: null,
        },
        {
          display_name: "Speaker C",
          display_order: 3,
          id: "candidate_3",
          internal_name: "Real speaker C",
        },
      ],
      generatedAt: new Date("2026-05-08T15:00:00.000Z"),
      voteCounts: [
        { candidate_id: "candidate_1", total_votes: 2 },
        { candidate_id: "candidate_2", total_votes: 4 },
      ],
    });

    expect(results).toMatchObject({
      audience_vote_id: "vote_1",
      total_votes: 6,
    });
    expect(results.results).toEqual([
      {
        candidate_id: "candidate_2",
        display_name: "Speaker B",
        display_order: 2,
        internal_name: null,
        percentage: 66.7,
        rank: 1,
        total_votes: 4,
      },
      {
        candidate_id: "candidate_1",
        display_name: "Speaker A",
        display_order: 1,
        internal_name: "Real speaker A",
        percentage: 33.3,
        rank: 2,
        total_votes: 2,
      },
      {
        candidate_id: "candidate_3",
        display_name: "Speaker C",
        display_order: 3,
        internal_name: "Real speaker C",
        percentage: 0,
        rank: 3,
        total_votes: 0,
      },
    ]);
    expect(JSON.stringify(results)).not.toContain("telegram");
    expect(JSON.stringify(results)).not.toContain("voter");
  });

  test("parses Operator broadcast summaries without exposing operator ids", () => {
    const broadcast = parseAudienceVoteBroadcast(
      makeAudienceVoteBroadcastResponse()
    );

    expect(broadcast.created_at).toBeInstanceOf(Date);
    expect(broadcast.next_stage_at).toBeInstanceOf(Date);
    expect(broadcast.delivery_counts.operator_canary.sent).toBe(1);
    expect(JSON.stringify(broadcast)).not.toContain("operator_telegram");
  });

  test("parses broadcast preview recipient estimates", () => {
    const preview = parseAudienceVoteBroadcastPreview({
      audience_vote_id: "vote_1",
      estimated_recipient_count: 42,
      include_open_button: true,
      message_text: "Public voting starts now",
    });

    expect(preview.estimated_recipient_count).toBe(42);
    expect(preview.include_open_button).toBe(true);
  });

  test("parses Operator-managed bot start settings", () => {
    const settings = parseAudienceVoteBotSettings({
      created_at: "2026-05-09T10:00:00.000Z",
      id: "default",
      start_button_text: "Відкрити голосування",
      start_message: "Привіт! Відкрийте голосування в Mini App.",
      updated_at: "2026-05-09T10:00:00.000Z",
    });

    expect(settings.created_at).toBeInstanceOf(Date);
    expect(settings.start_message).toContain("Mini App");
    expect(settings.start_button_text).toBe("Відкрити голосування");
  });

  test("parses Mini App feed responses without private candidate fields", () => {
    const feed = parseAudienceVoteMiniAppResponse({
      candidates: [
        {
          ...makeVoteCandidateResponse(),
          media: [
            {
              ...makeVoteCandidateMediaResponse(),
              blob_download_url:
                "https://example.public.blob.vercel-storage.com/file.jpg?download=1",
              blob_pathname:
                "audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg",
            },
          ],
        },
      ],
      selected_candidate_id: "candidate_1",
      status: "open_vote",
      vote: makeAudienceVoteResponse({ status: "open" }),
    });

    expect(feed).toEqual({
      candidates: [
        {
          caption: "Public caption",
          display_name: "Speaker A",
          display_order: 1,
          id: "candidate_1",
          media: [
            {
              blob_url: "https://example.public.blob.vercel-storage.com/file.jpg",
              content_type: "image/jpeg",
              display_order: 1,
              id: "media_1",
              media_type: "photo",
            },
          ],
        },
      ],
      selected_candidate_id: "candidate_1",
      status: "open_vote",
      vote: {
        id: "vote_1",
        kind: "speaker",
        title: "Speaker vote",
        window_end: null,
        window_start: null,
      },
    });
    expect(JSON.stringify(feed)).not.toContain("internal_name");
    expect(JSON.stringify(feed)).not.toContain("blob_download_url");
    expect(JSON.stringify(feed)).not.toContain("blob_pathname");
    expect(JSON.stringify(feed)).not.toContain("total_votes");
  });

  test("parses Mini App save vote responses without result totals", () => {
    const response = parseAudienceVoteMiniAppVoteResponse({
      audience_vote_id: "vote_1",
      selected_candidate_id: "candidate_2",
      status: "saved",
    });

    expect(response).toEqual({
      audience_vote_id: "vote_1",
      selected_candidate_id: "candidate_2",
      status: "saved",
    });
    expect(JSON.stringify(response)).not.toContain("total_votes");
  });
});

