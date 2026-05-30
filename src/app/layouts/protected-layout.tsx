"use client";

import { Suspense } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { useSession } from "@/shared/better-auth/hooks";
import QueryProvider from "@/app/providers/react-query";
import { Header } from "@/widgets/header";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  canAccessDashboardPath,
  readDashboardRoleFromSession,
} from "@/shared/better-auth/roles";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = readDashboardRoleFromSession(session.data);
  const canAccessPath = role ? canAccessDashboardPath(pathname, role) : false;

  useEffect(() => {
    if (!session.data && !session.isPending) {
      const query = searchParams?.toString() ?? "";
      const current = pathname + (query ? `?${query}` : "");
      router.replace(`/login?from=${encodeURIComponent(current)}`);
    }
  }, [session.data, session.isPending, router, pathname, searchParams]);

  useEffect(() => {
    if (session.data && role && !canAccessPath) {
      router.replace("/dashboard");
    }
  }, [canAccessPath, role, router, session.data]);

  if (!session.data && !session.isPending) {
    return null;
  }

  if (session.data && (!role || !canAccessPath)) {
    return <FancyLoader />;
  }

  return (
    <>
      {session.isPending && <FancyLoader />}
      {session.data && role && (
        <>
          <Header role={role} />
          {children}
        </>
      )}
    </>
  );
}

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryProvider>
      <Suspense>
        <AuthGuard>{children}</AuthGuard>
      </Suspense>
    </QueryProvider>
  );
}

const FancyLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <Card className="border-none shadow-elevated w-56 animate-in-scale">
        <CardContent className="p-8 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </CardContent>
      </Card>
    </div>
  );
};
