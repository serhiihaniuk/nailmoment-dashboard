import { describe, expect, test, vi } from "vitest";

import {
  createTicketDelivery,
  type TicketDeliveryDependencies,
  type TicketDeliveryTicket,
} from "./ticket-delivery";

function makeTicket(
  overrides: Partial<TicketDeliveryTicket> = {}
): TicketDeliveryTicket {
  return {
    email: " customer@example.com ",
    grade: "standard",
    id: "ticket-1",
    name: "Customer",
    qr_code: "https://example.com/qr.png",
    updated_grade: null,
    ...overrides,
  };
}

describe("Ticket Delivery", () => {
  test("hands off email and marks Ticket Delivery Status on success", async () => {
    const sendTicketEmail = vi.fn(async () => undefined) satisfies
      TicketDeliveryDependencies["sendTicketEmail"];
    const markTicketDeliverySent = vi.fn(async () => undefined) satisfies
      TicketDeliveryDependencies["markTicketDeliverySent"];
    const deliverTicket = createTicketDelivery({
      markTicketDeliverySent,
      sendTicketEmail,
    });

    const result = await deliverTicket(makeTicket({ updated_grade: "vip" }));

    expect(sendTicketEmail).toHaveBeenCalledWith(
      "customer@example.com",
      "Customer",
      "https://example.com/qr.png",
      "vip",
      "ticket-1"
    );
    expect(markTicketDeliverySent).toHaveBeenCalledWith("ticket-1");
    expect(result).toEqual({
      mailError: null,
      mailSent: true,
      status: "sent",
    });
  });

  test("keeps failed handoff best-effort and does not mark status", async () => {
    const sendTicketEmail = vi.fn(async () => {
      throw new Error("Provider down");
    }) satisfies TicketDeliveryDependencies["sendTicketEmail"];
    const markTicketDeliverySent = vi.fn(async () => undefined) satisfies
      TicketDeliveryDependencies["markTicketDeliverySent"];
    const deliverTicket = createTicketDelivery({
      markTicketDeliverySent,
      sendTicketEmail,
    });

    const result = await deliverTicket(makeTicket());

    expect(markTicketDeliverySent).not.toHaveBeenCalled();
    expect(result).toEqual({
      mailError: "Provider down",
      mailSent: false,
      status: "failed",
    });
  });

  test("does not perform customer-facing handoff when email is missing", async () => {
    const sendTicketEmail = vi.fn(async () => undefined) satisfies
      TicketDeliveryDependencies["sendTicketEmail"];
    const markTicketDeliverySent = vi.fn(async () => undefined) satisfies
      TicketDeliveryDependencies["markTicketDeliverySent"];
    const deliverTicket = createTicketDelivery({
      markTicketDeliverySent,
      sendTicketEmail,
    });

    const result = await deliverTicket(makeTicket({ email: "   " }));

    expect(sendTicketEmail).not.toHaveBeenCalled();
    expect(markTicketDeliverySent).not.toHaveBeenCalled();
    expect(result).toEqual({
      mailError: "Ticket Delivery requires a customer email.",
      mailSent: false,
      status: "failed",
    });
  });
});
