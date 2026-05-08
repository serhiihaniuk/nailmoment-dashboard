import { describe, expect, test } from "vitest";

import { isBetterAuthDisabledForDev } from "./dev-bypass";

describe("Better Auth develop bypass", () => {
  test("is fully disabled while this branch is used for v0 editing", () => {
    expect(isBetterAuthDisabledForDev()).toBe(true);
  });
});
