import { describe, expect, test } from "vitest";

import { DASHBOARD_ROLE } from "@/shared/better-auth/roles";
import { canPatchTicketForRole } from "./patch-policy";

describe("ticket patch role policy", () => {
  test("allows check-in users to update arrival only", () => {
    expect(
      canPatchTicketForRole(DASHBOARD_ROLE.CHECK_IN, { arrived: true })
    ).toBe(true);
    expect(
      canPatchTicketForRole(DASHBOARD_ROLE.CHECK_IN, {
        arrived: true,
        archived: true,
      })
    ).toBe(false);
    expect(
      canPatchTicketForRole(DASHBOARD_ROLE.CHECK_IN, { comment: "late" })
    ).toBe(false);
  });

  test("keeps admin ticket patches unrestricted", () => {
    expect(
      canPatchTicketForRole(DASHBOARD_ROLE.ADMIN, {
        archived: true,
        comment: "late",
      })
    ).toBe(true);
  });
});
