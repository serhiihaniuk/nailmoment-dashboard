import { afterEach, describe, expect, test, vi } from "vitest";

import { audienceVoteIdSchema } from "@/entities/audience-vote";
import {
  fetchAudienceVoteResults,
  fetchAudienceVoteUpdateScreen,
  updateAudienceVoteUpdateScreen,
} from "./audience-votes-client";

describe("audience votes API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("fetches aggregate results and parses the response boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        audience_vote_id: "vote_1",
        generated_at: "2026-05-08T15:00:00.000Z",
        results: [
          {
            candidate_id: "candidate_1",
            display_name: "Speaker A",
            display_order: 1,
            internal_name: "Real speaker A",
            percentage: 100,
            rank: 1,
            total_votes: 3,
          },
        ],
        total_votes: 3,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const results = await fetchAudienceVoteResults(
      audienceVoteIdSchema.parse("vote_1")
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/vote_1/results"
    );
    expect(results.generated_at).toBeInstanceOf(Date);
    expect(results.total_votes).toBe(3);
    expect(JSON.stringify(results)).not.toContain("telegram");
  });

  test("does not leak raw results API failure details to the dashboard", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          message:
            'Internal Server Error: Failed query: select "candidate_id" from "audience_vote_current_vote"',
        },
        { status: 500 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchAudienceVoteResults(audienceVoteIdSchema.parse("vote_1"))
    ).rejects.toThrow("Could not load Audience Vote results.");
  });

  test("fetches Operator-managed update screen settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        body: "Нове голосування зʼявиться після старту.",
        button_label: null,
        button_url: null,
        created_at: "2026-05-08T10:00:00.000Z",
        headline: "Голосування скоро",
        id: "default",
        updated_at: "2026-05-08T10:00:00.000Z",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const settings = await fetchAudienceVoteUpdateScreen();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/update-screen"
    );
    expect(settings.updated_at).toBeInstanceOf(Date);
    expect(settings.headline).toBe("Голосування скоро");
  });

  test("updates Operator-managed update screen settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        body: "Нове голосування зʼявиться після старту.",
        button_label: "Відкрити сайт",
        button_url: "https://nailmoment.pl",
        created_at: "2026-05-08T10:00:00.000Z",
        headline: "Голосування скоро",
        id: "default",
        updated_at: "2026-05-08T10:01:00.000Z",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const settings = await updateAudienceVoteUpdateScreen({
      body: "Нове голосування зʼявиться після старту.",
      button_label: "Відкрити сайт",
      button_url: "https://nailmoment.pl",
      headline: "Голосування скоро",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/update-screen",
      {
        body: JSON.stringify({
          body: "Нове голосування зʼявиться після старту.",
          button_label: "Відкрити сайт",
          button_url: "https://nailmoment.pl",
          headline: "Голосування скоро",
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      }
    );
    expect(settings.button_url).toBe("https://nailmoment.pl");
  });
});
