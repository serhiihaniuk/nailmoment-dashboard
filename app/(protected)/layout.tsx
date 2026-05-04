"use client";

import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/shared/better-auth/hooks";
import QueryProvider from "@/shared/providers/react-query";
import { Header } from "@/widgets/header";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!session.data && !session.isPending) {
      const current = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
      router.replace(`/login?from=${encodeURIComponent(current)}`);
    }
  }, [session.data, session.isPending, router, pathname, searchParams]);

  if (!session.data && !session.isPending) {
    return null;
  }

  return (
    <>
      {session.isPending && <FancyLoader />}
      {session.data && children}
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
      <Header />
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
