import { upload } from "@vercel/blob/client";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  audienceVoteIdSchema,
  voteCandidateIdSchema,
} from "@/entities/audience-vote";
import { uploadVoteCandidateMedia } from "./vote-candidate-media-client";

vi.mock("@vercel/blob/client", () => ({
  upload: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: () => "media_1",
}));

describe("vote candidate media client", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test("confirms a completed client upload so the dashboard does not wait for the Blob callback", async () => {
    const blob = makeBlobResult();
    vi.mocked(upload).mockResolvedValue(blob);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(makeMediaResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["image"], "portrait.jpg", { type: "image/jpeg" });
    const media = await uploadVoteCandidateMedia({
      candidateId: voteCandidateIdSchema.parse("candidate_1"),
      file,
      voteId: audienceVoteIdSchema.parse("vote_1"),
    });

    expect(upload).toHaveBeenCalledWith(
      "audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg",
      file,
      expect.objectContaining({
        access: "public",
        contentType: "image/jpeg",
        handleUploadUrl:
          "/api/audience-vote/vote_1/candidates/candidate_1/media/upload",
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/vote_1/candidates/candidate_1/media/upload",
      expect.objectContaining({
        method: "POST",
      })
    );

    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body)
    ) as {
      payload: { blob: { pathname: string }; clientPayload: string };
      type: string;
    };
    const clientPayload = JSON.parse(requestBody.payload.clientPayload) as {
      mediaId: string;
    };

    expect(requestBody.type).toBe("app.confirm-client-upload");
    expect(requestBody.payload.blob.pathname).toBe(blob.pathname);
    expect(clientPayload.mediaId).toBe("media_1");
    expect(media.created_at).toBeInstanceOf(Date);
  });
});

function makeBlobResult() {
  return {
    contentDisposition: 'inline; filename="portrait.jpg"',
    contentType: "image/jpeg",
    downloadUrl:
      "https://blob.example.com/audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg?download=1",
    etag: "etag_1",
    pathname: "audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg",
    url: "https://blob.example.com/audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg",
  };
}

function makeMediaResponse() {
  return {
    archived: false,
    blob_download_url:
      "https://blob.example.com/audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg?download=1",
    blob_pathname:
      "audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg",
    blob_url:
      "https://blob.example.com/audience-votes/vote_1/candidates/candidate_1/media/media_1.jpg",
    candidate_id: "candidate_1",
    content_type: "image/jpeg",
    created_at: "2026-05-08T16:00:00.000Z",
    display_order: 1,
    file_name: "portrait.jpg",
    file_size_bytes: 5,
    id: "media_1",
    media_type: "photo",
    updated_at: "2026-05-08T16:00:00.000Z",
  };
}
