import { describe, expect, test, vi } from "vitest";

import { parseBattleTicket, type BattleTicket } from "@/entities/battle-ticket";
import {
  createBattleTicketDelivery,
  type BattleTicketDeliveryDependencies,
} from "./battle-ticket-delivery";

function makeBattleTicket(
  overrides: Record<string, unknown> = {}
): BattleTicket {
  return parseBattleTicket({
    archived: false,
    comment: "",
    date: "2026-01-01T10:00:00.000Z",
    email: " customer@example.com ",
    id: "battle-ticket-1",
    instagram: "battle_artist",
    mail_sent: false,
    name: "Battle Artist",
    nomination_quantity: 1,
    payment_type: "full",
    phone: "+48123123123",
    photos_sent: false,
    stripe_event_id: "manual_battle_battle-ticket-1",
    ...overrides,
  });
}

describe("Battle Ticket Delivery", () => {
  test("hands off email and marks Battle Ticket Delivery Status on success", async () => {
    const sendBattleTicketEmail = vi.fn(async () => undefined) satisfies
      BattleTicketDeliveryDependencies["sendBattleTicketEmail"];
    const markBattleTicketDeliveryHandedOff = vi.fn(
      async () => undefined
    ) satisfies
      BattleTicketDeliveryDependencies["markBattleTicketDeliveryHandedOff"];
    const deliverBattleTicket = createBattleTicketDelivery({
      markBattleTicketDeliveryHandedOff,
      sendBattleTicketEmail,
    });
    const battleTicket = makeBattleTicket();

    const result = await deliverBattleTicket(battleTicket);

    expect(sendBattleTicketEmail).toHaveBeenCalledWith(
      "customer@example.com",
      "Battle Artist",
      battleTicket.id
    );
    expect(markBattleTicketDeliveryHandedOff).toHaveBeenCalledWith(
      battleTicket.id
    );
    expect(result.mailError).toBeNull();
    expect(result.mailSent).toBe(true);
    expect(result.status).toBe("sent");
    expect(result.battleTicket.mail_sent).toBe(true);
    expect(result.battleTicket.delivery_status).toBe("handed_off");
  });

  test("keeps failed handoff best-effort and does not mark status", async () => {
    const sendBattleTicketEmail = vi.fn(async () => {
      throw new Error("Provider down");
    }) satisfies BattleTicketDeliveryDependencies["sendBattleTicketEmail"];
    const markBattleTicketDeliveryHandedOff = vi.fn(
      async () => undefined
    ) satisfies
      BattleTicketDeliveryDependencies["markBattleTicketDeliveryHandedOff"];
    const deliverBattleTicket = createBattleTicketDelivery({
      markBattleTicketDeliveryHandedOff,
      sendBattleTicketEmail,
    });

    const result = await deliverBattleTicket(makeBattleTicket());

    expect(markBattleTicketDeliveryHandedOff).not.toHaveBeenCalled();
    expect(result.mailError).toBe("Provider down");
    expect(result.mailSent).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.battleTicket.mail_sent).toBe(false);
    expect(result.battleTicket.delivery_status).toBe("pending");
  });

  test("does not perform customer-facing handoff when email is missing", async () => {
    const sendBattleTicketEmail = vi.fn(async () => undefined) satisfies
      BattleTicketDeliveryDependencies["sendBattleTicketEmail"];
    const markBattleTicketDeliveryHandedOff = vi.fn(
      async () => undefined
    ) satisfies
      BattleTicketDeliveryDependencies["markBattleTicketDeliveryHandedOff"];
    const deliverBattleTicket = createBattleTicketDelivery({
      markBattleTicketDeliveryHandedOff,
      sendBattleTicketEmail,
    });

    const result = await deliverBattleTicket(makeBattleTicket({ email: "   " }));

    expect(sendBattleTicketEmail).not.toHaveBeenCalled();
    expect(markBattleTicketDeliveryHandedOff).not.toHaveBeenCalled();
    expect(result).toEqual({
      battleTicket: makeBattleTicket({ email: "   " }),
      mailError: "Battle Ticket Delivery requires a customer email.",
      mailSent: false,
      status: "failed",
    });
  });
});
