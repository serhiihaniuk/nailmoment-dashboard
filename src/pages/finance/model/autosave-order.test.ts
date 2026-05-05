import { describe, expect, test } from "vitest";
import { createAutosaveOrder } from "./autosave-order";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

describe("autosave ordering", () => {
  test("serializes writes for the same field", async () => {
    const order = createAutosaveOrder();
    const firstRelease = deferred();
    const events: string[] = [];

    const first = order.run("payment:1:amount", async () => {
      events.push("first:start");
      await firstRelease.promise;
      events.push("first:end");
      return "first";
    });
    const second = order.run("payment:1:amount", async () => {
      events.push("second:start");
      return "second";
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["first:start"]);

    firstRelease.resolve();
    await expect(Promise.all([first, second])).resolves.toEqual([
      "first",
      "second",
    ]);
    expect(events).toEqual(["first:start", "first:end", "second:start"]);
  });

  test("marks older field versions as stale", () => {
    const order = createAutosaveOrder();
    const firstVersion = order.begin("finance:ticket-1:gross_total");
    const secondVersion = order.begin("finance:ticket-1:gross_total");

    expect(
      order.isLatest({
        fieldKey: "finance:ticket-1:gross_total",
        fieldVersion: firstVersion,
      })
    ).toBe(false);
    expect(
      order.isLatest({
        fieldKey: "finance:ticket-1:gross_total",
        fieldVersion: secondVersion,
      })
    ).toBe(true);
  });
});
