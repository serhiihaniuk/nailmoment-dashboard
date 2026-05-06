import { describe, expect, test } from "vitest";
import { resolveFinanceDiscountInput } from "./finance-discount";

describe("finance discount input", () => {
  test("resolves money-like input as a positive amount", () => {
    expect(resolveFinanceDiscountInput("-100 zł", "499.00")).toEqual({
      amount: "100.00",
      kind: "amount",
    });
  });

  test("resolves percent input against the gross total", () => {
    expect(resolveFinanceDiscountInput("10% Dishop", "530.00")).toEqual({
      amount: "53.00",
      kind: "percent",
      percent: 10,
    });
  });

  test("rejects invalid and impossible percent input", () => {
    expect(resolveFinanceDiscountInput("abc", "530.00")).toEqual({
      error: "Введіть суму або відсоток",
    });
    expect(resolveFinanceDiscountInput("110%", "530.00")).toEqual({
      error: "Знижка не може бути більшою за 100%",
    });
  });
});
