import { describe, expect, test } from "vitest";

import {
  audienceVoteIdSchema,
  type AudienceVote,
} from "@/entities/audience-vote";
import {
  createAudienceVoteScheduleDraft,
  findAudienceVoteScheduleConflict,
  mapAudienceVoteScheduleConflictToFieldErrors,
  parseAudienceVoteScheduleDraft,
} from "./audience-vote-schedule";

const now = new Date("2026-05-09T12:00:00.000Z");

describe("audience vote schedule", () => {
  test("detects overlapping scheduled vote windows", () => {
    const conflict = findAudienceVoteScheduleConflict({
      now,
      schedule: {
        status: "scheduled",
        window_end: new Date("2026-05-09T14:30:00.000Z"),
        window_start: new Date("2026-05-09T13:30:00.000Z"),
      },
      votes: [
        makeVote({
          id: audienceVoteIdSchema.parse("vote_2"),
          title: "Battle vote",
          window_end: new Date("2026-05-09T14:00:00.000Z"),
          window_start: new Date("2026-05-09T13:00:00.000Z"),
        }),
      ],
    });

    expect(conflict?.conflictingVote.id).toBe("vote_2");
    expect(conflict?.reason).toBe("overlap");
  });

  test("allows adjacent scheduled vote windows", () => {
    const conflict = findAudienceVoteScheduleConflict({
      now,
      schedule: {
        status: "scheduled",
        window_end: new Date("2026-05-09T15:00:00.000Z"),
        window_start: new Date("2026-05-09T14:00:00.000Z"),
      },
      votes: [
        makeVote({
          window_end: new Date("2026-05-09T14:00:00.000Z"),
          window_start: new Date("2026-05-09T13:00:00.000Z"),
        }),
      ],
    });

    expect(conflict).toBeNull();
  });

  test("does not reserve a schedule window when only an end time is set", () => {
    const conflict = findAudienceVoteScheduleConflict({
      now,
      schedule: {
        status: "scheduled",
        window_end: new Date("2026-05-09T14:00:00.000Z"),
        window_start: null,
      },
      votes: [
        makeVote({
          window_end: new Date("2026-05-09T14:00:00.000Z"),
          window_start: new Date("2026-05-09T13:00:00.000Z"),
        }),
      ],
    });

    expect(conflict).toBeNull();
  });

  test("explains when an open-ended vote blocks a scheduled start", () => {
    const conflict = findAudienceVoteScheduleConflict({
      now,
      schedule: {
        status: "scheduled",
        window_end: new Date("2026-05-10T13:00:00.000Z"),
        window_start: new Date("2026-05-10T12:00:00.000Z"),
      },
      votes: [
        makeVote({
          status: "open",
          title: "Live vote",
          window_end: null,
          window_start: null,
        }),
      ],
    });

    expect(conflict?.reason).toBe("open_ended_vote");
    expect(conflict?.message).toContain("не має часу завершення");

    expect(
      conflict ? mapAudienceVoteScheduleConflictToFieldErrors(conflict) : {}
    ).toEqual({
      window_start: conflict?.message,
    });
  });

  test("creates a schedule draft with saved opening broadcast settings", () => {
    const draft = createAudienceVoteScheduleDraft(
      makeVote({
        opening_broadcast_include_open_button: false,
        opening_broadcast_message_text: "Voting starts now",
      })
    );

    expect(draft.opening_broadcast_enabled).toBe(true);
    expect(draft.opening_broadcast_include_open_button).toBe(false);
    expect(draft.opening_broadcast_message_text).toBe("Voting starts now");
  });

  test("parses an enabled opening broadcast into the schedule payload", () => {
    const parsed = parseAudienceVoteScheduleDraft({
      opening_broadcast_enabled: true,
      opening_broadcast_include_open_button: false,
      opening_broadcast_message_text: "  Voting starts now  ",
      status: "scheduled",
      window_end: "2026-05-09T13:00:00.000Z",
      window_start: "2026-05-09T12:00:00.000Z",
    });

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.data.opening_broadcast).toEqual({
        include_open_button: false,
        message_text: "Voting starts now",
      });
    }
  });

  test("maps opening broadcast validation to the message field", () => {
    const parsed = parseAudienceVoteScheduleDraft({
      opening_broadcast_enabled: true,
      opening_broadcast_include_open_button: true,
      opening_broadcast_message_text: "",
      status: "scheduled",
      window_end: "",
      window_start: "2026-05-09T12:00:00.000Z",
    });

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.errors.opening_broadcast_message_text).toBeDefined();
    }
  });
});

function makeVote(overrides: Partial<AudienceVote> = {}): AudienceVote {
  return {
    archived: false,
    created_at: new Date("2026-05-09T10:00:00.000Z"),
    id: audienceVoteIdSchema.parse("vote_1"),
    kind: "speaker",
    opening_broadcast_include_open_button: true,
    opening_broadcast_message_text: null,
    status: "scheduled",
    title: "Speaker vote",
    updated_at: new Date("2026-05-09T10:00:00.000Z"),
    window_end: null,
    window_start: null,
    ...overrides,
  };
}
