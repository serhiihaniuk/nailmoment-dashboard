import { describe, expect, test } from "vitest";

import { isBetterAuthUiDisabledForDev } from "./dev-bypass";

describe("Better Auth UI dev bypass", () => {
  test("does not disable auth in Vercel production", () => {
    expect(
      isBetterAuthUiDisabledForDev({
        NEXT_PUBLIC_DISABLE_BETTER_AUTH_UI: "true",
        NEXT_PUBLIC_VERCEL_ENV: "production",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  test("disables auth in local development", () => {
    expect(
      isBetterAuthUiDisabledForDev({
        NODE_ENV: "development",
      })
    ).toBe(true);
  });

  test("disables auth for the develop preview branch", () => {
    expect(
      isBetterAuthUiDisabledForDev({
        NEXT_PUBLIC_VERCEL_ENV: "preview",
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: "develop",
        NODE_ENV: "production",
      })
    ).toBe(true);
  });

  test("keeps auth enabled for other preview branches by default", () => {
    expect(
      isBetterAuthUiDisabledForDev({
        NEXT_PUBLIC_VERCEL_ENV: "preview",
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: "feature/auth-test",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  test("allows an explicit non-production UI bypass flag", () => {
    expect(
      isBetterAuthUiDisabledForDev({
        NEXT_PUBLIC_DISABLE_AUTH: "1",
        NEXT_PUBLIC_VERCEL_ENV: "preview",
        NODE_ENV: "production",
      })
    ).toBe(true);
  });
});
