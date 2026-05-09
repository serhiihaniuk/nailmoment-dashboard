import { describe, expect, test } from "vitest";

import {
  audienceVoteIdSchema,
  type AudienceVote,
} from "@/entities/audience-vote";
import { findAudienceVoteScheduleConflict } from "./audience-vote-schedule";

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
});

function makeVote(overrides: Partial<AudienceVote> = {}): AudienceVote {
  return {
    archived: false,
    created_at: new Date("2026-05-09T10:00:00.000Z"),
    id: audienceVoteIdSchema.parse("vote_1"),
    kind: "speaker",
    status: "scheduled",
    title: "Speaker vote",
    updated_at: new Date("2026-05-09T10:00:00.000Z"),
    window_end: null,
    window_start: null,
    ...overrides,
  };
}
