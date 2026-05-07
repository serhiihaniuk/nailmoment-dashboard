"use client";

import {
  parseBattleTicketList,
  type BattleTicket,
} from "@/entities/battle-ticket";

export async function fetchBattleTickets(): Promise<BattleTicket[]> {
  const response = await fetch("/api/battle-ticket");
  if (!response.ok) throw new Error(await response.text());
  return parseBattleTicketList(await response.json());
}
