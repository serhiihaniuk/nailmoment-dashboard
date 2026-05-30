import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import {
  dashboardAccessControl,
  dashboardRoles,
} from "@/shared/better-auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac: dashboardAccessControl,
      roles: dashboardRoles,
    }),
  ],
});
