import { describe, expect, test } from "vitest";
import {
  getBattleTicketDeliveryStatus,
  isManualBattleTicket,
  isSoftDeletedBattleTicket,
  isStripeBattleTicket,
  parseAddBattleTicketSuccess,
  parseBattleTicket,
  parseBattleTicketId,
  parseBattleTicketList,
} from "./battle-ticket";

function makeBattleTicketPayload(overrides: Record<string, unknown> = {}) {
  return {
    archived: false,
    comment: "",
    date: "2026-01-01T10:00:00.000Z",
    email: "battle@example.com",
    id: "battle-ticket-1",
    instagram: "battle_artist",
    mail_sent: false,
    name: "Battle Artist",
    nomination_quantity: 2,
    payment_type: "full",
    phone: "+48123123123",
    photos_sent: false,
    stripe_event_id: "manual_battle_battle-ticket-1",
    ...overrides,
  };
}

describe("Battle Ticket domain parsing", () => {
  test("parses a Manual Battle Ticket with pending delivery status", () => {
    const battleTicket = parseBattleTicket(makeBattleTicketPayload());

    expect(battleTicket.date).toBeInstanceOf(Date);
    expect(battleTicket.origin).toBe("manual");
    expect(battleTicket.delivery_status).toBe("pending");
    expect(isManualBattleTicket(battleTicket)).toBe(true);
  });

  test("parses a Stripe Battle Ticket with handed-off delivery status", () => {
    const battleTicket = parseBattleTicket(
      makeBattleTicketPayload({
        mail_sent: true,
        stripe_event_id: "cs_test_123",
      })
    );

    expect(battleTicket.origin).toBe("stripe");
    expect(battleTicket.delivery_status).toBe("handed_off");
    expect(isStripeBattleTicket(battleTicket)).toBe(true);
  });

  test("accepts Soft Deleted Battle Tickets explicitly", () => {
    const battleTicket = parseBattleTicket(
      makeBattleTicketPayload({ archived: true })
    );

    expect(isSoftDeletedBattleTicket(battleTicket)).toBe(true);
  });

  test("maps Battle Ticket Delivery Status from mail handoff state", () => {
    expect(getBattleTicketDeliveryStatus(false)).toBe("pending");
    expect(getBattleTicketDeliveryStatus(true)).toBe("handed_off");
  });

  test("parses list and manual creation success responses", () => {
    const payload = makeBattleTicketPayload({ mail_sent: true });

    expect(parseBattleTicketList([payload])).toHaveLength(1);
    expect(
      parseAddBattleTicketSuccess({
        battleTicket: payload,
        mailError: null,
        mailSent: true,
      }).battleTicket.delivery_status
    ).toBe("handed_off");
  });

  test("rejects invalid Battle Ticket API payloads", () => {
    expect(() =>
      parseBattleTicket(makeBattleTicketPayload({ payment_type: "unknown" }))
    ).toThrow();
    expect(() =>
      parseBattleTicket(makeBattleTicketPayload({ date: "not-a-date" }))
    ).toThrow();
    expect(() =>
      parseBattleTicket(makeBattleTicketPayload({ nomination_quantity: -1 }))
    ).toThrow();
    expect(() =>
      parseBattleTicketList([makeBattleTicketPayload({ id: "" })])
    ).toThrow();
    expect(() => parseBattleTicketId("")).toThrow();
  });
});
