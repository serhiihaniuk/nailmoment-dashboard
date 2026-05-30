import { NextResponse } from "next/server";
import { getAnyDashboardSession, type DashboardSession } from "./auth";
import { dashboardRoles, type DashboardPermissionRequest } from "./permissions";
import {
  DASHBOARD_ROLE,
  readDashboardRoleFromSession,
  type DashboardRole,
} from "./roles";

type AuthorizedDashboardSession = NonNullable<DashboardSession>;

export type DashboardAuthorization =
  | {
      ok: true;
      role: DashboardRole;
      session: AuthorizedDashboardSession;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function authorizeDashboardRequest(
  permissions: DashboardPermissionRequest
): Promise<DashboardAuthorization> {
  const session = await getAnyDashboardSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = readDashboardRoleFromSession(session);
  if (!role || !hasDashboardPermission(role, permissions)) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, role, session };
}

export async function authorizeDashboardAdminRequest(): Promise<DashboardAuthorization> {
  return authorizeDashboardRequest({ page: ["admin"] });
}

export function hasDashboardPermission(
  role: DashboardRole,
  permissions: DashboardPermissionRequest
): boolean {
  if (role === DASHBOARD_ROLE.ADMIN) {
    return dashboardRoles.admin.authorize(permissions).success;
  }

  return dashboardRoles.check_in.authorize(toCheckInPermissionRequest(permissions))
    .success;
}

export function isDashboardAdminSession(session: DashboardSession): boolean {
  return readDashboardRoleFromSession(session) === DASHBOARD_ROLE.ADMIN;
}

function toCheckInPermissionRequest(
  permissions: DashboardPermissionRequest
): Parameters<typeof dashboardRoles.check_in.authorize>[0] {
  return permissions as Parameters<typeof dashboardRoles.check_in.authorize>[0];
}
