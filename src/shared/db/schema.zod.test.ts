import { describe, expect, test } from "vitest";

import {
  createAudienceVoteClientSchema,
  createVoteCandidateClientSchema,
  insertAudienceVoteSchema,
  insertVoteCandidateSchema,
  patchAudienceVoteScheduleClientSchema,
  patchVoteCandidateClientSchema,
  patchVoteCandidateMediaClientSchema,
} from "./schema.zod";

describe("audience vote route schemas", () => {
  test("parses draft or scheduled create input with optional windows", () => {
    const parsed = createAudienceVoteClientSchema.parse({
      kind: "battle",
      status: "scheduled",
      title: "Battle category A",
      window_end: "",
      window_start: "2026-05-08T12:00:00.000Z",
    });

    expect(parsed.window_start).toBeInstanceOf(Date);
    expect(parsed.window_end).toBeNull();
  });

  test("rejects transition statuses and invalid planning windows on create", () => {
    expect(() =>
      createAudienceVoteClientSchema.parse({
        kind: "speaker",
        status: "open",
        title: "Speaker vote",
        window_end: "",
        window_start: "",
      })
    ).toThrow();

    expect(() =>
      createAudienceVoteClientSchema.parse({
        kind: "speaker",
        status: "draft",
        title: "Speaker vote",
        window_end: "2026-05-08T11:00:00.000Z",
        window_start: "2026-05-08T12:00:00.000Z",
      })
    ).toThrow("Завершення має бути після початку");
  });

  test("defaults omitted opening broadcast fields on DB insert", () => {
    const parsed = insertAudienceVoteSchema.parse({
      id: "vote_1",
      kind: "speaker",
      status: "draft",
      title: "Speaker vote",
      window_end: "",
      window_start: "",
    });

    expect(parsed.opening_broadcast_include_open_button).toBe(true);
    expect(parsed.opening_broadcast_message_text).toBeNull();
  });

  test("normalizes blank opening broadcast text on DB insert", () => {
    const parsed = insertAudienceVoteSchema.parse({
      id: "vote_1",
      kind: "speaker",
      opening_broadcast_message_text: "   ",
      status: "draft",
      title: "Speaker vote",
      window_end: "",
      window_start: "",
    });

    expect(parsed.opening_broadcast_message_text).toBeNull();
  });
});

describe("vote candidate route schemas", () => {
  test("normalizes optional private labels and public captions", () => {
    const parsed = createVoteCandidateClientSchema.parse({
      caption: "  Public caption  ",
      display_name: "  Anonymous finalist  ",
      internal_name: "",
    });

    expect(parsed).toEqual({
      caption: "Public caption",
      display_name: "Anonymous finalist",
      internal_name: null,
    });
  });

  test("parses partial updates and display order changes", () => {
    expect(
      patchVoteCandidateClientSchema.parse({
        caption: "",
        display_order: "3",
      })
    ).toEqual({
      caption: null,
      display_order: 3,
    });
  });

  test("parses DB insert payloads with nullable private fields", () => {
    const parsed = insertVoteCandidateSchema.parse({
      audience_vote_id: "vote_1",
      caption: null,
      display_name: "Anonymous finalist 1",
      display_order: 1,
      id: "candidate_1",
      internal_name: null,
    });

    expect(parsed).toMatchObject({
      audience_vote_id: "vote_1",
      caption: null,
      display_name: "Anonymous finalist 1",
      display_order: 1,
      id: "candidate_1",
      internal_name: null,
    });
  });

  test("parses open vote closing-time schedule updates", () => {
    const parsed = patchAudienceVoteScheduleClientSchema.parse({
      status: "open",
      window_end: "2026-05-09T20:00:00.000Z",
      window_start: "2026-05-08T12:00:00.000Z",
    });

    expect(parsed.status).toBe("open");
    expect(parsed.window_end).toBeInstanceOf(Date);
  });

  test("parses scheduled opening broadcast updates", () => {
    const parsed = patchAudienceVoteScheduleClientSchema.parse({
      opening_broadcast: {
        include_open_button: false,
        message_text: "  Voting starts now  ",
      },
      status: "scheduled",
      window_end: "2026-05-09T20:00:00.000Z",
      window_start: "2026-05-09T19:00:00.000Z",
    });

    expect(parsed.opening_broadcast).toEqual({
      include_open_button: false,
      message_text: "Voting starts now",
    });
  });

  test("parses media reorder and restore patches", () => {
    expect(
      patchVoteCandidateMediaClientSchema.parse({
        display_order: "3",
      })
    ).toEqual({
      display_order: 3,
    });

    expect(
      patchVoteCandidateMediaClientSchema.parse({
        archived: false,
      })
    ).toEqual({
      archived: false,
    });
  });


  test("rejects missing display names and oversized internal names", () => {
    expect(() =>
      createVoteCandidateClientSchema.parse({
        display_name: "",
      })
    ).toThrow("Публічне ім’я обов’язкове");

    expect(() =>
      createVoteCandidateClientSchema.parse({
        display_name: "Candidate",
        internal_name: "x".repeat(161),
      })
    ).toThrow("Внутрішня назва має бути не довшою за 160 символів");
  });
});

