import type { UpdateTicketOutput } from "@/shared/db/schema.zod";
import {
  DASHBOARD_ROLE,
  type DashboardRole,
} from "@/shared/better-auth/roles";

export function canPatchTicketForRole(
  role: DashboardRole,
  patch: UpdateTicketOutput
): boolean {
  if (role === DASHBOARD_ROLE.ADMIN) return true;

  return isArrivalOnlyPatch(patch);
}

function isArrivalOnlyPatch(patch: UpdateTicketOutput): boolean {
  const keys = Object.keys(patch);

  return keys.length === 1 && keys[0] === "arrived";
}
