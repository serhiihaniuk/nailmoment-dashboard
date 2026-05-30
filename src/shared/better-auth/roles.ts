export const DASHBOARD_ROLE = {
  ADMIN: "admin",
  CHECK_IN: "check_in",
} as const;

export type DashboardRole =
  (typeof DASHBOARD_ROLE)[keyof typeof DASHBOARD_ROLE];

const DASHBOARD_ROLE_VALUES = Object.values(DASHBOARD_ROLE);

export function isDashboardRole(value: unknown): value is DashboardRole {
  return (
    typeof value === "string" &&
    DASHBOARD_ROLE_VALUES.includes(value as DashboardRole)
  );
}

export function parseDashboardRoles(value: unknown): DashboardRole[] {
  if (Array.isArray(value)) {
    return value.filter(isDashboardRole);
  }

  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((role) => role.trim())
    .filter(isDashboardRole);
}

export function getPrimaryDashboardRole(value: unknown): DashboardRole | null {
  const roles = parseDashboardRoles(value);
  if (roles.includes(DASHBOARD_ROLE.ADMIN)) return DASHBOARD_ROLE.ADMIN;
  if (roles.includes(DASHBOARD_ROLE.CHECK_IN)) return DASHBOARD_ROLE.CHECK_IN;
  return null;
}

export function readDashboardRoleFromSession(
  session: unknown
): DashboardRole | null {
  if (!isRecord(session)) return null;
  const user = session.user;
  if (!isRecord(user)) return null;
  return getPrimaryDashboardRole(user.role);
}

export function canAccessDashboardPath(
  pathname: string | null,
  role: DashboardRole
): boolean {
  if (role === DASHBOARD_ROLE.ADMIN) return true;
  if (!pathname) return false;

  return (
    pathname === "/dashboard" ||
    pathname === "/info" ||
    pathname.startsWith("/ticket/")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
