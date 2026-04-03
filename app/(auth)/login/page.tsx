"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/shared/better-auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NailIcon } from "@/widgets/header";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await authClient.signIn.email(
      {
        email,
        password,
        callbackURL: from,
      },
      {
        onRequest: () => {
          setLoading(true);
          setError(undefined);
        },
        onSuccess: () => router.push(from),
        onError: (ctx) => setError(ctx.error.message),
      },
    );
  };

  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-surface p-6">
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-[12px] text-muted-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-[12px] text-muted-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-9"
          />
        </div>

        {error && (
          <p className="text-[12px] text-destructive" aria-live="assertive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 mt-2"
        >
          {loading ? "Signing in…" : "Увійти"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full min-h-dvh flex items-center justify-center bg-background">
      <div className="w-full max-w-90 mx-4 animate-in-scale">
        <div className="flex justify-center mb-8">
          <NailIcon className="w-24" />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
