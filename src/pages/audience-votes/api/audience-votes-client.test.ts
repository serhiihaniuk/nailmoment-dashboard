import { afterEach, describe, expect, test, vi } from "vitest";

import {
  audienceVoteBroadcastIdSchema,
  audienceVoteIdSchema,
} from "@/entities/audience-vote";
import {
  createAudienceVoteBroadcast,
  interruptAudienceVoteBroadcast,
  previewAudienceVoteBroadcast,
} from "./audience-vote-broadcasts-client";
import {
  fetchAudienceVoteUpdateScreen,
  updateAudienceVoteUpdateScreen,
} from "./audience-vote-update-screen-client";
import {
  fetchAudienceVoteResults,
  updateAudienceVoteSchedule,
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
    ).rejects.toThrow("Не вдалося завантажити результати голосування.");
  });

  test("previews a broadcast and parses active recipient estimates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        audience_vote_id: "vote_1",
        estimated_recipient_count: 30,
        include_open_button: true,
        message_text: "Public voting starts now",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const preview = await previewAudienceVoteBroadcast({
      audience_vote_id: "vote_1",
      include_open_button: true,
      message_text: "Public voting starts now",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/broadcasts/preview",
      expect.objectContaining({ method: "POST" })
    );
    expect(preview.estimated_recipient_count).toBe(30);
  });

  test("creates a broadcast and parses canary delivery state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(makeBroadcastResponse())
    );
    vi.stubGlobal("fetch", fetchMock);

    const broadcast = await createAudienceVoteBroadcast({
      audience_vote_id: "vote_1",
      include_open_button: true,
      message_text: "Public voting starts now",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/broadcasts",
      expect.objectContaining({ method: "POST" })
    );
    expect(broadcast.created_at).toBeInstanceOf(Date);
    expect(broadcast.delivery_counts.operator_canary.sent).toBe(1);
  });

  test("interrupts a canary broadcast by id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(makeBroadcastResponse({ status: "interrupted" }))
    );
    vi.stubGlobal("fetch", fetchMock);

    const broadcast = await interruptAudienceVoteBroadcast(
      audienceVoteBroadcastIdSchema.parse("broadcast_1")
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/broadcasts/broadcast_1/interrupt",
      { method: "POST" }
    );
    expect(broadcast.status).toBe("interrupted");
  });

  test("fetches the managed Mini App update screen", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(makeUpdateScreenResponse())
    );
    vi.stubGlobal("fetch", fetchMock);

    const updateScreen = await fetchAudienceVoteUpdateScreen();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/update-screen"
    );
    expect(updateScreen.updated_at).toBeInstanceOf(Date);
    expect(updateScreen.title).toBe("Voting soon");
  });

  test("updates the managed Mini App update screen", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        makeUpdateScreenResponse({
          message: "Check back soon",
          title: "Voting soon",
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const updateScreen = await updateAudienceVoteUpdateScreen({
      message: "Check back soon",
      title: "Voting soon",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/update-screen",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(updateScreen.message).toBe("Check back soon");
  });

  test("updates a draft vote schedule and parses the updated vote", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        makeVoteResponse({
          status: "scheduled",
          window_end: "2026-05-09T13:00:00.000Z",
          window_start: "2026-05-09T12:00:00.000Z",
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const vote = await updateAudienceVoteSchedule(
      audienceVoteIdSchema.parse("vote_1"),
      {
        status: "scheduled",
        window_end: new Date("2026-05-09T13:00:00.000Z"),
        window_start: new Date("2026-05-09T12:00:00.000Z"),
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audience-vote/vote_1",
      expect.objectContaining({ method: "PATCH" })
    );
    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("Expected schedule update request to be sent.");
    }
    const requestInit = firstCall[1];
    if (
      !requestInit ||
      typeof requestInit !== "object" ||
      !("body" in requestInit)
    ) {
      throw new Error("Expected schedule update request body.");
    }
    expect(JSON.parse(String(requestInit.body))).toEqual({
      status: "scheduled",
      window_end: "2026-05-09T13:00:00.000Z",
      window_start: "2026-05-09T12:00:00.000Z",
    });
    expect(vote.status).toBe("scheduled");
    expect(vote.window_start).toBeInstanceOf(Date);
  });

  test("updates scheduled opening broadcast settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        makeVoteResponse({
          opening_broadcast_include_open_button: false,
          opening_broadcast_message_text: "Voting starts in Telegram",
          status: "scheduled",
          window_end: "2026-05-09T13:00:00.000Z",
          window_start: "2026-05-09T12:00:00.000Z",
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const vote = await updateAudienceVoteSchedule(
      audienceVoteIdSchema.parse("vote_1"),
      {
        opening_broadcast: {
          include_open_button: false,
          message_text: "Voting starts in Telegram",
        },
        status: "scheduled",
        window_end: new Date("2026-05-09T13:00:00.000Z"),
        window_start: new Date("2026-05-09T12:00:00.000Z"),
      }
    );

    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("Expected schedule update request to be sent.");
    }
    const requestInit = firstCall[1];
    if (
      !requestInit ||
      typeof requestInit !== "object" ||
      !("body" in requestInit)
    ) {
      throw new Error("Expected schedule update request body.");
    }
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      opening_broadcast: {
        include_open_button: false,
        message_text: "Voting starts in Telegram",
      },
    });
    expect(vote.opening_broadcast_include_open_button).toBe(false);
    expect(vote.opening_broadcast_message_text).toBe(
      "Voting starts in Telegram"
    );
  });
});

function makeBroadcastResponse(overrides: Record<string, unknown> = {}) {
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
    status: "canary_operator_sent",
    updated_at: "2026-05-08T16:00:00.000Z",
    ...overrides,
  };
}

function makeUpdateScreenResponse(overrides: Record<string, unknown> = {}) {
  return {
    created_at: "2026-05-08T16:00:00.000Z",
    id: "default",
    message: "No active vote",
    title: "Voting soon",
    updated_at: "2026-05-08T16:00:00.000Z",
    ...overrides,
  };
}

function makeVoteResponse(overrides: Record<string, unknown> = {}) {
  return {
    archived: false,
    created_at: "2026-05-08T16:00:00.000Z",
    id: "vote_1",
    kind: "speaker",
    opening_broadcast_include_open_button: true,
    opening_broadcast_message_text: null,
    status: "draft",
    title: "Dev smoke vote",
    updated_at: "2026-05-08T16:00:00.000Z",
    window_end: null,
    window_start: null,
    ...overrides,
  };
}
