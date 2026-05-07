"use client";

import {
  parseAddBattleTicketSuccess,
  type AddBattleTicketSuccess,
} from "@/entities/battle-ticket";
import {
  AddBattleTicketFormValues,
  parseAddBattleTicketApiError,
} from "../model/add-battle-ticket";

export async function addBattleTicket(
  body: AddBattleTicketFormValues,
): Promise<AddBattleTicketSuccess> {
  const response = await fetch("/api/battle-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseAddBattleTicketApiError(json);
  }

  return parseAddBattleTicketSuccess(json);
}
