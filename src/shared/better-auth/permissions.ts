import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
} from "better-auth/plugins/admin/access";

export const dashboardPermissionStatement = {
  ...defaultStatements,
  page: [
    "dashboard",
    "ticket",
    "info",
    "finance",
    "battle",
    "audience-votes",
    "cookie-analytics",
    "pdf",
    "admin",
  ],
  ticket: ["read", "check-in", "create", "update", "archive", "resend-email"],
  finance: ["read", "write"],
  payment: ["read", "write", "delete"],
  battleTicket: ["read", "write"],
  audienceVote: ["read", "write", "broadcast"],
  analytics: ["read"],
} as const;

export const dashboardAccessControl = createAccessControl(
  dashboardPermissionStatement
);

export const dashboardAdminRole = dashboardAccessControl.newRole({
  ...adminAc.statements,
  page: [
    "dashboard",
    "ticket",
    "info",
    "finance",
    "battle",
    "audience-votes",
    "cookie-analytics",
    "pdf",
    "admin",
  ],
  ticket: ["read", "check-in", "create", "update", "archive", "resend-email"],
  finance: ["read", "write"],
  payment: ["read", "write", "delete"],
  battleTicket: ["read", "write"],
  audienceVote: ["read", "write", "broadcast"],
  analytics: ["read"],
});

export const dashboardCheckInRole = dashboardAccessControl.newRole({
  page: ["dashboard", "ticket", "info"],
  ticket: ["read", "check-in"],
});

export const dashboardRoles = {
  admin: dashboardAdminRole,
  check_in: dashboardCheckInRole,
} as const;

export type DashboardPermissionRequest = Parameters<
  typeof dashboardAdminRole.authorize
>[0];
