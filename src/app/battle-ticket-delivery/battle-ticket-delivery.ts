import { eq } from "drizzle-orm";

import {
  parseBattleTicket,
  type BattleTicket,
  type BattleTicketId,
} from "@/entities/battle-ticket";
import { db } from "@/shared/db";
import { battleTicketTable } from "@/shared/db/schema";
import { sendBattleEmail } from "@/shared/email/send-email";

export type BattleTicketDeliveryTicket = BattleTicket;

export type BattleTicketDeliveryResult =
  | {
      battleTicket: BattleTicket;
      mailError: null;
      mailSent: true;
      status: "sent";
    }
  | {
      battleTicket: BattleTicket;
      mailError: string;
      mailSent: false;
      status: "failed";
    };

export type BattleTicketDeliveryDependencies = {
  markBattleTicketDeliveryHandedOff: (
    battleTicketId: BattleTicketId
  ) => Promise<void>;
  sendBattleTicketEmail: (
    to: string,
    name: string,
    battleTicketId: BattleTicketId
  ) => Promise<void>;
};

const MISSING_EMAIL_ERROR =
  "Battle Ticket Delivery requires a customer email.";

function readDeliveryError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error while sending battle ticket email";
}

function updateBattleTicketDeliveryStatus(
  battleTicket: BattleTicket,
  mailSent: boolean
): BattleTicket {
  return parseBattleTicket({
    ...battleTicket,
    mail_sent: mailSent,
  });
}

export function createBattleTicketDelivery({
  markBattleTicketDeliveryHandedOff,
  sendBattleTicketEmail,
}: BattleTicketDeliveryDependencies) {
  return async function deliverBattleTicket(
    battleTicket: BattleTicketDeliveryTicket
  ): Promise<BattleTicketDeliveryResult> {
    const customerEmail = battleTicket.email.trim();

    if (!customerEmail) {
      return {
        battleTicket,
        mailError: MISSING_EMAIL_ERROR,
        mailSent: false,
        status: "failed",
      };
    }

    try {
      await sendBattleTicketEmail(
        customerEmail,
        battleTicket.name,
        battleTicket.id
      );
      await markBattleTicketDeliveryHandedOff(battleTicket.id);

      return {
        battleTicket: updateBattleTicketDeliveryStatus(battleTicket, true),
        mailError: null,
        mailSent: true,
        status: "sent",
      };
    } catch (error) {
      return {
        battleTicket: updateBattleTicketDeliveryStatus(battleTicket, false),
        mailError: readDeliveryError(error),
        mailSent: false,
        status: "failed",
      };
    }
  };
}

export const deliverBattleTicket = createBattleTicketDelivery({
  markBattleTicketDeliveryHandedOff: async (battleTicketId) => {
    await db
      .update(battleTicketTable)
      .set({ mail_sent: true })
      .where(eq(battleTicketTable.id, battleTicketId));
  },
  sendBattleTicketEmail: sendBattleEmail,
});
