"use client";

import { Ticket } from "@/shared/db/schema";
import { AddTicketApiError, AddTicketFormValues } from "../model/types";

export type AddTicketSuccess = {
  ticket: Ticket;
  mailSent: boolean;
  mailError: string | null;
};

export async function addTicket(
  body: AddTicketFormValues,
): Promise<AddTicketSuccess> {
  const response = await fetch("/api/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    throw json as AddTicketApiError;
  }

  return json as AddTicketSuccess;
}
