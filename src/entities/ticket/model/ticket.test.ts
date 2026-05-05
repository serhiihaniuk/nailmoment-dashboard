import { describe, expect, test } from "vitest";
import {
  normalizeMoneyString,
  normalizeTicketGrade,
  parseTicketGrade,
  parseTicketGradeOrUnknown,
  splitMoney,
} from "./ticket";

describe("ticket domain parsing", () => {
  test("normalizes legacy and current ticket grades", () => {
    expect(normalizeTicketGrade(" VIP ")).toBe("vip");
    expect(normalizeTicketGrade("standart")).toBe("standard");
    expect(parseTicketGrade("maxi")).toBe("maxi");
  });

  test("keeps unknown grades explicit at read boundaries", () => {
    expect(parseTicketGradeOrUnknown("mystery")).toBe("unknown");
    expect(parseTicketGradeOrUnknown(null)).toBe("unknown");
    expect(() => parseTicketGrade("mystery")).toThrow(
      "Invalid ticket grade"
    );
  });

  test("normalizes and splits money in cents", () => {
    expect(normalizeMoneyString("12,3")).toBe("12.30");
    expect(normalizeMoneyString("-5")).toBe("0.00");
    expect(splitMoney("10.00", 3)).toEqual(["3.34", "3.33", "3.33"]);
    expect(splitMoney("1.00", 0)).toEqual([]);
  });
});
