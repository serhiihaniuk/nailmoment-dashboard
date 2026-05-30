import { describe, expect, test } from "vitest";

import { dashboardRoles } from "./permissions";

describe("dashboard permissions", () => {
  test("allows admins to keep full dashboard access", () => {
    expect(
      dashboardRoles.admin.authorize({
        finance: ["write"],
        ticket: ["resend-email", "update"],
      }).success
    ).toBe(true);
  });

  test("limits check-in users to ticket read and arrival actions", () => {
    expect(
      dashboardRoles.check_in.authorize({
        ticket: ["read", "check-in"],
      }).success
    ).toBe(true);
    expect(
      dashboardRoles.check_in.authorize({
        page: ["finance"],
      }).success
    ).toBe(false);
  });
});
