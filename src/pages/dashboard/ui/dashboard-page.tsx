"use client";

import { Suspense } from "react";
import { TicketsTable } from "./tickets-table";
import { CheckInTicketsTable } from "./check-in-tickets-table";
import { useSession } from "@/shared/better-auth/hooks";
import {
  DASHBOARD_ROLE,
  readDashboardRoleFromSession,
} from "@/shared/better-auth/roles";

export default function DashboardPage() {
  const session = useSession();
  const role = readDashboardRoleFromSession(session.data);

  return (
    <div className="page-container flex flex-col gap-4 py-6">
      <Suspense>
        {role === DASHBOARD_ROLE.CHECK_IN ? (
          <CheckInTicketsTable />
        ) : (
          <TicketsTable />
        )}
      </Suspense>
    </div>
  );
}
