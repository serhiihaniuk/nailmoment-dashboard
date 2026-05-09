import { afterEach, describe, expect, test, vi } from "vitest";

import {
  audienceVoteIdSchema,
  voteCandidateIdSchema,
} from "@/entities/audience-vote";
import {
  fetchAudienceVoteMiniAppFeed,
  saveAudienceVoteMiniAppVote,
} from "./mini-app-client";

describe("Audience Vote Mini App API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("fetches the public feed with Telegram initData and selected candidate state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        candidates: [],
        selected_candidate_id: "candidate_1",
        status: "open_vote",
        vote: {
          id: "vote_1",
          kind: "speaker",
          title: "Speaker vote",
          window_end: null,
          window_start: null,
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const feed = await fetchAudienceVoteMiniAppFeed("signed-init-data");

    expect(fetchMock).toHaveBeenCalledWith("/api/audience-vote/mini-app", {
      cache: "no-store",
      headers: {
        "x-telegram-init-data": "signed-init-data",
      },
    });
    expect(feed).toMatchObject({
      selected_candidate_id: "candidate_1",
      status: "open_vote",
    });
    expect(JSON.stringify(feed)).not.toContain("total_votes");
  });

  test("fetches the dashboard preview feed with the preview header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        status: "update_screen",
        update_screen: {
          message: "Preview message",
          title: "Preview",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const feed = await fetchAudienceVoteMiniAppFeed("dashboard-preview", {
      dashboardPreview: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/audience-vote/mini-app", {
      cache: "no-store",
      headers: {
        "x-dashboard-mini-app-preview": "1",
        "x-telegram-init-data": "dashboard-preview",
      },
    });
    expect(feed).toMatchObject({ status: "update_screen" });
  });

  test("saves the current vote through the Telegram initData boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        audience_vote_id: "vote_1",
        selected_candidate_id: "candidate_2",
        status: "saved",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await saveAudienceVoteMiniAppVote({
      audienceVoteId: audienceVoteIdSchema.parse("vote_1"),
      candidateId: voteCandidateIdSchema.parse("candidate_2"),
      initData: "signed-init-data",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/audience-vote/mini-app", {
      body: JSON.stringify({
        audience_vote_id: "vote_1",
        candidate_id: "candidate_2",
      }),
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-telegram-init-data": "signed-init-data",
      },
      method: "POST",
    });
    expect(response).toEqual({
      audience_vote_id: "vote_1",
      selected_candidate_id: "candidate_2",
      status: "saved",
    });
    expect(JSON.stringify(response)).not.toContain("total_votes");
  });

  test("hides raw server errors from voters when saving fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          message:
            "Internal Server Error: Insert select error: selected fields are not the same",
        },
        { status: 500 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      saveAudienceVoteMiniAppVote({
        audienceVoteId: audienceVoteIdSchema.parse("vote_1"),
        candidateId: voteCandidateIdSchema.parse("candidate_2"),
        initData: "signed-init-data",
      })
    ).rejects.toThrow("Не вдалося зберегти голос.");
  });
});
