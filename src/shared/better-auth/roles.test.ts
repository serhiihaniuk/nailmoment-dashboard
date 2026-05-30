import { describe, expect, test } from "vitest";

import {
  DASHBOARD_ROLE,
  canAccessDashboardPath,
  getPrimaryDashboardRole,
  parseDashboardRoles,
  readDashboardRoleFromSession,
} from "./roles";

describe("dashboard roles", () => {
  test("parses single and comma-separated Better Auth roles", () => {
    expect(parseDashboardRoles("check_in")).toEqual([DASHBOARD_ROLE.CHECK_IN]);
    expect(parseDashboardRoles("check_in, admin")).toEqual([
      DASHBOARD_ROLE.CHECK_IN,
      DASHBOARD_ROLE.ADMIN,
    ]);
    expect(parseDashboardRoles(["admin", "unknown"])).toEqual([
      DASHBOARD_ROLE.ADMIN,
    ]);
  });

  test("prefers admin when a user has multiple dashboard roles", () => {
    expect(getPrimaryDashboardRole("check_in,admin")).toBe(DASHBOARD_ROLE.ADMIN);
    expect(getPrimaryDashboardRole("check_in")).toBe(DASHBOARD_ROLE.CHECK_IN);
    expect(getPrimaryDashboardRole("viewer")).toBeNull();
  });

  test("reads role from a session-like object without trusting unknown shapes", () => {
    expect(
      readDashboardRoleFromSession({
        user: { role: "admin" },
      })
    ).toBe(DASHBOARD_ROLE.ADMIN);
    expect(readDashboardRoleFromSession({ user: {} })).toBeNull();
    expect(readDashboardRoleFromSession(null)).toBeNull();
  });

  test("limits check-in users to ticket and info pages", () => {
    expect(canAccessDashboardPath("/dashboard", DASHBOARD_ROLE.CHECK_IN)).toBe(
      true
    );
    expect(canAccessDashboardPath("/ticket/ticket-1", DASHBOARD_ROLE.CHECK_IN))
      .toBe(true);
    expect(canAccessDashboardPath("/info", DASHBOARD_ROLE.CHECK_IN)).toBe(true);
    expect(canAccessDashboardPath("/finance", DASHBOARD_ROLE.CHECK_IN)).toBe(
      false
    );
    expect(canAccessDashboardPath("/finance", DASHBOARD_ROLE.ADMIN)).toBe(true);
  });
});
