"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/shared/better-auth/hooks";
import QueryProvider from "@/shared/providers/react-query";
import { Header } from "@/widgets/header";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session.data && !session.isPending) {
      router.replace("/login");
    }
  }, [session.data, session.isPending, router]);

  if (!session.data && !session.isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>You are not signed in</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      {session.isPending && <FancyLoader />}
      {session.data && <QueryProvider>{children}</QueryProvider>}
    </>
  );
}

const FancyLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <Card className="border-none shadow-xl w-56">
        <CardContent className="p-8 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </CardContent>
      </Card>
    </div>
  );
};
