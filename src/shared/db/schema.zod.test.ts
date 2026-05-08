import { describe, expect, test } from "vitest";

import { createAudienceVoteClientSchema } from "./schema.zod";

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
    ).toThrow("Window end must be after window start");
  });
});

