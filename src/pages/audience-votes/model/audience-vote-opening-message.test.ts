import { describe, expect, test } from "vitest";

import {
  audienceVoteIdSchema,
  type AudienceVote,
} from "@/entities/audience-vote";
import {
  createAudienceVoteOpeningMessageDraft,
  mapAudienceVoteOpeningMessageApiErrors,
  parseAudienceVoteOpeningMessageDraft,
} from "./audience-vote-opening-message";

describe("audience vote opening message", () => {
  test("creates a disabled draft when no start message is saved", () => {
    const draft = createAudienceVoteOpeningMessageDraft(makeVote());

    expect(draft).toEqual({
      enabled: false,
      include_open_button: false,
      message_text: "",
    });
  });

  test("creates an enabled draft from a saved start message", () => {
    const draft = createAudienceVoteOpeningMessageDraft(
      makeVote({
        opening_broadcast_include_open_button: false,
        opening_broadcast_message_text: "Voting starts now",
      })
    );

    expect(draft).toEqual({
      enabled: true,
      include_open_button: false,
      message_text: "Voting starts now",
    });
  });

  test("parses an enabled message while preserving the vote schedule", () => {
    const vote = makeVote({
      status: "scheduled",
      window_end: new Date("2026-05-09T13:00:00.000Z"),
      window_start: new Date("2026-05-09T12:00:00.000Z"),
    });
    const parsed = parseAudienceVoteOpeningMessageDraft({
      draft: {
        enabled: true,
        include_open_button: false,
        message_text: "  Voting starts now  ",
      },
      vote,
    });

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.data).toEqual({
        opening_broadcast: {
          include_open_button: false,
          message_text: "Voting starts now",
        },
        status: "scheduled",
        window_end: vote.window_end,
        window_start: vote.window_start,
      });
    }
  });

  test("parses a disabled message as a cleared opening broadcast", () => {
    const vote = makeVote({
      opening_broadcast_message_text: "Old message",
      status: "draft",
    });
    const parsed = parseAudienceVoteOpeningMessageDraft({
      draft: {
        enabled: false,
        include_open_button: true,
        message_text: "",
      },
      vote,
    });

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.data.opening_broadcast).toBeNull();
    }
  });

  test("maps blank enabled messages to the message field", () => {
    const parsed = parseAudienceVoteOpeningMessageDraft({
      draft: {
        enabled: true,
        include_open_button: true,
        message_text: "",
      },
      vote: makeVote(),
    });

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.errors.message_text).toBeDefined();
    }
  });

  test("maps API opening broadcast errors to the dialog fields", () => {
    const errors = mapAudienceVoteOpeningMessageApiErrors({
      errors: {
        "opening_broadcast.include_open_button": ["Invalid button value"],
        "opening_broadcast.message_text": ["Message required"],
      },
      message: "Invalid payload",
    });

    expect(errors).toEqual({
      include_open_button: "Invalid button value",
      message_text: "Message required",
    });
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
