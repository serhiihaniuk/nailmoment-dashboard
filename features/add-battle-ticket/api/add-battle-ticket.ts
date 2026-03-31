"use client";

import { BattleTicket } from "@/shared/db/schema";
import {
  AddBattleTicketApiError,
  AddBattleTicketFormValues,
} from "../model/types";

export type AddBattleTicketSuccess = {
  battleTicket: BattleTicket;
  mailSent: boolean;
  mailError: string | null;
};

export async function addBattleTicket(
  body: AddBattleTicketFormValues,
): Promise<AddBattleTicketSuccess> {
  const response = await fetch("/api/battle-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    throw json as AddBattleTicketApiError;
  }

  return json as AddBattleTicketSuccess;
}
