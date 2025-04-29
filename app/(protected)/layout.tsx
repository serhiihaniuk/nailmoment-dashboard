"use client";

import { useSession } from "@/shared/better-auth/hooks";
import QueryProvider from "@/shared/providers/react-query";
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

  if (session.isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );
  }

  if (!session.data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>You are not signed in</p>
      </div>
    );
  }

  return <QueryProvider>{children}</QueryProvider>;
}
