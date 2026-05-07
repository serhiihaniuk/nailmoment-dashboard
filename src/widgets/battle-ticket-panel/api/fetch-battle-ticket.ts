"use client";

import {
  parseBattleTicket,
  type BattleTicket,
} from "@/entities/battle-ticket";

export async function fetchBattleTicket(
  id: string
): Promise<BattleTicket | null> {
  const response = await fetch(`/api/battle-ticket/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await response.text());
  return parseBattleTicket(await response.json());
}
