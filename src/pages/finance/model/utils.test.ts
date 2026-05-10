import { describe, expect, test } from "vitest";
import type { TicketWithFinance } from "@/entities/ticket";
import { ApiError } from "./types";
import {
  getUnscheduledGrossPaymentAmount,
  readApiError,
  suggestedPaymentAmount,
} from "./utils";

const createdAt = new Date("2026-01-01T10:00:00.000Z");

function makeFinance(
  overrides: Partial<NonNullable<TicketWithFinance["finance"]>> = {}
): NonNullable<TicketWithFinance["finance"]> {
  return {
    id: "finance-1",
    ticket_id: "ticket-1",
    sale_source: "site",
    payment_plan: "full",
    gross_total: "500.00",
    discount_amount: "0.00",
    tax_amount: "100.00",
    net_total: "400.00",
    nip: "",
    finance_note: "",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

function makeTicket(
  overrides: Partial<TicketWithFinance> = {}
): TicketWithFinance {
  const finance = overrides.finance ?? makeFinance();
  const payments = overrides.payments ?? [];

  return {
    id: "ticket-1",
    name: "Ticket Owner",
    email: "owner@example.com",
    phone: "+48123123123",
    instagram: "",
    grade: "standard",
    updated_grade: null,
    comment: "",
    date: createdAt,
    archived: false,
    arrived: false,
    mail_sent: false,
    qr_code: "",
    stripe_event_id: "manual_ticket-1",
    finance,
    payments,
    finance_summary: {
      gross_total: finance?.gross_total ?? "0.00",
      paid_total: "0.00",
      remaining_total: finance?.gross_total ?? "0.00",
      payment_count: payments.length,
      payment_status: finance ? "unpaid" : "untracked",
      invoice_status: payments.length > 0 ? "not_needed" : null,
      next_due_date: null,
    },
    ...overrides,
  };
}

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

describe("finance payment amount defaults", () => {
  test("suggests new payments from discounted payable total", () => {
    expect(
      suggestedPaymentAmount(
        makeTicket({
          finance: makeFinance({ payment_plan: "two_parts" }),
        }),
        1
      )
    ).toBe("250.00");
  });

  test("keeps manual add-payment remainder anchored to payable total", () => {
    const ticket = makeTicket({
      payments: [
        {
          id: "payment-1",
          ticket_id: "ticket-1",
          installment_number: 1,
          amount: "400.00",
          sale_source: "site",
          due_date: null,
          is_paid: false,
          paid_date: null,
          payment_method: "other",
          invoice_status: "not_needed",
          invoice_number: "",
          comment: "",
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
    });

    expect(getUnscheduledGrossPaymentAmount(ticket)).toBe("100.00");
  });
});
