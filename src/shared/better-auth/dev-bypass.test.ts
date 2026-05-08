import { describe, expect, test } from "vitest";

import { isBetterAuthDisabledForDev } from "./dev-bypass";

describe("Better Auth UI dev bypass", () => {
  test("does not disable auth in Vercel production", () => {
    expect(
      isBetterAuthDisabledForDev({
        env: {
          NEXT_PUBLIC_DISABLE_BETTER_AUTH_UI: "true",
          NEXT_PUBLIC_VERCEL_ENV: "production",
          NODE_ENV: "production",
        },
      })
    ).toBe(false);
  });

  test("does not disable auth on the production dashboard host", () => {
    expect(
      isBetterAuthDisabledForDev({
        env: {
          NEXT_PUBLIC_VERCEL_ENV: "production",
          NODE_ENV: "production",
        },
        hostname: "dashboard.nailmoment.pl",
      })
    ).toBe(false);
  });

  test("disables auth on the explicit dev dashboard host", () => {
    expect(
      isBetterAuthDisabledForDev({
        env: {
          NEXT_PUBLIC_VERCEL_ENV: "production",
          NODE_ENV: "production",
        },
        hostname: "dev.dashboard.nailmoment.pl:443",
      })
    ).toBe(true);
  });

  test("disables auth in local development", () => {
    expect(
      isBetterAuthDisabledForDev({
        env: {
          NODE_ENV: "development",
        },
      })
    ).toBe(true);
  });

  test("disables auth for Vercel preview branches", () => {
    expect(
      isBetterAuthDisabledForDev({
        env: {
          NEXT_PUBLIC_VERCEL_ENV: "preview",
          NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: "v0/authless-editing",
          NODE_ENV: "production",
        },
      })
    ).toBe(true);
  });

  test("allows an explicit non-production UI bypass flag", () => {
    expect(
      isBetterAuthDisabledForDev({
        env: {
          NEXT_PUBLIC_DISABLE_AUTH: "1",
          NEXT_PUBLIC_VERCEL_ENV: "preview",
          NODE_ENV: "production",
        },
      })
    ).toBe(true);
  });
});
