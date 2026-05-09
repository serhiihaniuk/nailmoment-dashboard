import { afterEach, describe, expect, test, vi } from "vitest";
import { createTicketWithFinance, syncTicketPaymentPlan } from "./client";

function makeTicketResponse() {
  return {
    id: "ticket-1",
    name: "Ticket Owner",
    email: "owner@example.com",
    phone: "+48123123123",
    instagram: "owner_handle",
    grade: "standard",
    updated_grade: null,
    comment: "",
    date: "2026-01-01T10:00:00.000Z",
    archived: false,
    arrived: false,
    mail_sent: false,
    qr_code: "",
    stripe_event_id: "",
    finance: {
      id: "finance-1",
      ticket_id: "ticket-1",
      sale_source: "site",
      payment_plan: "three_parts",
      gross_total: "100",
      discount_amount: "0",
      tax_amount: "20",
      net_total: "80",
      nip: "",
      finance_note: "",
      created_at: "2026-01-01T10:00:00.000Z",
      updated_at: "2026-01-01T10:00:00.000Z",
    },
    payments: [],
    finance_summary: {
      gross_total: "100",
      paid_total: "0",
      remaining_total: "100",
      payment_count: 0,
      payment_status: "unpaid",
      invoice_status: null,
      next_due_date: null,
    },
  };
}

describe("finance API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("syncs payment plan and parses the ticket response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(makeTicketResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const ticket = await syncTicketPaymentPlan("ticket-1", "three_parts");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ticket/ticket-1/finance/payment-plan",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_plan: "three_parts" }),
      }
    );
    expect(ticket.date).toBeInstanceOf(Date);
    expect(ticket.finance?.payment_plan).toBe("three_parts");
    expect(ticket.finance?.gross_total).toBe("100.00");
    expect(ticket.finance_summary.remaining_total).toBe("100.00");
  });

  test("creates initial payments from the discounted and fee-adjusted payable total", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ticket: { id: "ticket-1" } }))
      .mockResolvedValueOnce(
        Response.json({
          id: "finance-1",
          ticket_id: "ticket-1",
          sale_source: "site",
          payment_plan: "two_parts",
          gross_total: "500",
          discount_amount: "100",
          tax_amount: "20",
          net_total: "380",
          nip: "",
          finance_note: "",
          created_at: "2026-01-01T10:00:00.000Z",
          updated_at: "2026-01-01T10:00:00.000Z",
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "payment-1",
          ticket_id: "ticket-1",
          installment_number: 1,
          amount: "200",
          sale_source: "site",
          due_date: null,
          is_paid: false,
          paid_date: null,
          payment_method: "other",
          invoice_status: "not_needed",
          invoice_number: "",
          comment: "",
          created_at: "2026-01-01T10:00:00.000Z",
          updated_at: "2026-01-01T10:00:00.000Z",
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "payment-2",
          ticket_id: "ticket-1",
          installment_number: 2,
          amount: "200",
          sale_source: "site",
          due_date: null,
          is_paid: false,
          paid_date: null,
          payment_method: "other",
          invoice_status: "not_needed",
          invoice_number: "",
          comment: "",
          created_at: "2026-01-01T10:00:00.000Z",
          updated_at: "2026-01-01T10:00:00.000Z",
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await createTicketWithFinance({
      name: "Ticket Owner",
      email: "owner@example.com",
      phone: "+48123123123",
      instagram: "",
      grade: "standard",
      payment_sale_source: "site",
      payment_plan: "two_parts",
      gross_total: "500.00",
      discount_amount: "100.00",
      tax_amount: "20.00",
      nip: "",
      finance_note: "",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/ticket/ticket-1/payments",
      expect.objectContaining({
        body: expect.stringContaining('"amount":"190.00"'),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/ticket/ticket-1/payments",
      expect.objectContaining({
        body: expect.stringContaining('"is_paid":false'),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/ticket/ticket-1/payments",
      expect.objectContaining({
        body: expect.stringContaining('"amount":"190.00"'),
      })
    );
  });
});
