import { beforeEach, describe, expect, test, vi } from "vitest";

const logtailMock = vi.hoisted(() => ({
  error: vi.fn(),
  flush: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/shared/logtail", () => ({
  logtail: logtailMock,
}));

import { logStripe } from "./log";

describe("Stripe logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("tolerates optional context fields being explicitly undefined", () => {
    const context = {
      stripeEventId: undefined,
      stripeSessionId: undefined,
    };

    logStripe("info", "Processed checkout", context);

    expect(logtailMock.info).toHaveBeenCalledWith(
      "Processed checkout",
      context
    );
  });

  test("prefixes messages with the safe tail of a Stripe id", () => {
    logStripe("warn", "Duplicate event", {
      stripeEventId: "evt_1234567890",
    });

    expect(logtailMock.warn).toHaveBeenCalledWith("7890 Duplicate event", {
      stripeEventId: "evt_1234567890",
    });
  });
});
