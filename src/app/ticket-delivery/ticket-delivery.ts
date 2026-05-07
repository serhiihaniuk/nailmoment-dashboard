import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { ticketTable } from "@/shared/db/schema";
import { sendTicketEmail } from "@/shared/email/send-email";

export type TicketDeliveryTicket = {
  email: string;
  grade: string;
  id: string;
  name: string;
  qr_code: string;
  updated_grade?: string | null;
};

export type TicketDeliveryResult =
  | {
      mailError: null;
      mailSent: true;
      status: "sent";
    }
  | {
      mailError: string;
      mailSent: false;
      status: "failed";
    };

export type TicketDeliveryDependencies = {
  markTicketDeliverySent: (ticketId: string) => Promise<void>;
  sendTicketEmail: (
    to: string,
    name: string,
    qrCodeUrl: string,
    ticketGrade: string,
    ticketId: string
  ) => Promise<void>;
};

const MISSING_EMAIL_ERROR = "Ticket Delivery requires a customer email.";

function readDeliveryError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error while sending ticket email";
}

function getDeliveryTicketGrade(ticket: TicketDeliveryTicket): string {
  return ticket.updated_grade ? ticket.updated_grade : ticket.grade;
}

export function createTicketDelivery({
  markTicketDeliverySent,
  sendTicketEmail,
}: TicketDeliveryDependencies) {
  return async function deliverTicket(
    ticket: TicketDeliveryTicket
  ): Promise<TicketDeliveryResult> {
    const customerEmail = ticket.email.trim();

    if (!customerEmail) {
      return {
        mailError: MISSING_EMAIL_ERROR,
        mailSent: false,
        status: "failed",
      };
    }

    try {
      await sendTicketEmail(
        customerEmail,
        ticket.name,
        ticket.qr_code,
        getDeliveryTicketGrade(ticket),
        ticket.id
      );
      await markTicketDeliverySent(ticket.id);

      return {
        mailError: null,
        mailSent: true,
        status: "sent",
      };
    } catch (error) {
      return {
        mailError: readDeliveryError(error),
        mailSent: false,
        status: "failed",
      };
    }
  };
}

export const deliverTicket = createTicketDelivery({
  markTicketDeliverySent: async (ticketId) => {
    await db
      .update(ticketTable)
      .set({ mail_sent: true })
      .where(eq(ticketTable.id, ticketId));
  },
  sendTicketEmail,
});
