import { describe, expect, test } from "vitest";
import type { TicketWithFinance } from "@/entities/ticket";
import { buildDiscountOptions } from "./discount-options";

const createdAt = new Date("2026-01-01T10:00:00.000Z");

function makeTicket(
  finance: NonNullable<TicketWithFinance["finance"]>
): TicketWithFinance {
  return {
    id: finance.ticket_id,
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
    stripe_event_id: "",
    finance,
    payments: [],
    finance_summary: {
      gross_total: "0.00",
      paid_total: "0.00",
      remaining_total: "0.00",
      payment_count: 0,
      payment_status: "unpaid",
      invoice_status: null,
      next_due_date: null,
    },
  };
}

function makeFinance(
  overrides: Partial<NonNullable<TicketWithFinance["finance"]>>
): NonNullable<TicketWithFinance["finance"]> {
  return {
    id: `finance-${overrides.ticket_id ?? "1"}`,
    ticket_id: overrides.ticket_id ?? "ticket-1",
    sale_source: "site",
    payment_plan: "full",
    gross_total: "499.00",
    discount_amount: "0.00",
    tax_amount: "0.00",
    net_total: "499.00",
    nip: "",
    finance_note: "",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

describe("finance discount options", () => {
  test("returns the curated discount presets only", () => {
    const options = buildDiscountOptions([
      makeTicket(
        makeFinance({
          ticket_id: "ticket-1",
          discount_amount: "100",
          finance_note: "-100",
        })
      ),
      makeTicket(
        makeFinance({
          ticket_id: "ticket-2",
          discount_amount: "53",
          finance_note: "10% Dishop",
        })
      ),
      makeTicket(
        makeFinance({
          ticket_id: "ticket-3",
          discount_amount: "100.00",
          finance_note: "manual note",
        })
      ),
    ]);

    expect(options).toEqual(["100.00", "10% Dishop"]);
  });
});
