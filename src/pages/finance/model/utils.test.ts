import { describe, expect, test } from "vitest";
import { ApiError } from "./types";
import { readApiError } from "./utils";

describe("finance API error parsing", () => {
  test("parses Zod-style issue arrays into field errors", async () => {
    const response = Response.json(
      {
        error: [
          { message: "Required", path: ["payment_plan"] },
          { message: "Too small", path: ["gross_total"] },
        ],
      },
      { status: 400, statusText: "Bad Request" }
    );

    const error = await readApiError(response, {
      payment_plan: "paymentPlan",
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Required");
    expect(error.fieldErrors).toEqual({
      gross_total: "Too small",
      paymentPlan: "Required",
    });
  });

  test("falls back when the response body is not JSON", async () => {
    const response = new Response("not-json", {
      status: 500,
      statusText: "Server Error",
    });

    const error = await readApiError(response);

    expect(error.message).toBe("Server Error");
    expect(error.fieldErrors).toEqual({});
  });
});
