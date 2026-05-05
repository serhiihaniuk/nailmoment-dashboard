import { describe, expect, test } from "vitest";
import {
  extractInstagramName,
  extractInstagramUsername,
  formatInstagramLink,
} from "./instagram";

describe("instagram parsing", () => {
  test("extracts a username from supported profile inputs", () => {
    expect(extractInstagramUsername("@nail.moment")).toBe("nail.moment");
    expect(
      extractInstagramUsername("https://www.instagram.com/nail.moment/")
    ).toBe("nail.moment");
  });

  test("does not mistake post URLs for profile usernames", () => {
    expect(extractInstagramUsername("https://instagram.com/p/abc123")).toBe(
      "https://instagram.com/p/abc123"
    );
  });

  test("formats and strips profile links safely", () => {
    expect(formatInstagramLink("nail.moment")).toBe(
      "https://www.instagram.com/nail.moment"
    );
    expect(
      extractInstagramName("https://www.instagram.com/nail.moment/?utm=one")
    ).toBe("nail.moment");
    expect(extractInstagramName("https://www.instagram.com/")).toBe("");
  });
});
