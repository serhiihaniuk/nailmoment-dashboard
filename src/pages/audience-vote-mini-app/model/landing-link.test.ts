import { describe, expect, test } from "vitest";

import { NAIL_MOMENT_MINI_APP_TICKET_CTA_URL } from "./landing-link";

describe("Audience Vote Mini App landing link", () => {
  test("tags the bottom ticket CTA as Telegram Mini App traffic", () => {
    const url = new URL(NAIL_MOMENT_MINI_APP_TICKET_CTA_URL);

    expect(url.origin).toBe("https://www.nailmoment.pl");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("utm_source")).toBe("telegram");
    expect(url.searchParams.get("utm_medium")).toBe("mini_app");
    expect(url.searchParams.get("utm_campaign")).toBe("audience_vote");
    expect(url.searchParams.get("utm_content")).toBe("bottom_ticket_cta");
    expect(url.searchParams.get("utm_term")).toBe("ticket_button");
  });
});
