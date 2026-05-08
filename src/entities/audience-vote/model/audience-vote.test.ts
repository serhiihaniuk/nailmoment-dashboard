import { describe, expect, test } from "vitest";

import {
  buildVoteCandidateMediaPath,
  parsePublicVoteCandidate,
  parseAudienceVote,
  parseAudienceVoteList,
  parseVoteCandidate,
  parseVoteCandidateMedia,
  voteCandidateMediaUploadPayloadSchema,
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
    ).toThrow("Photos must be 20 MB or less");
  });
});

