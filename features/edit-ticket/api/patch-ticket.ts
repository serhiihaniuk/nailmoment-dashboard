"use client";

import { UpdateTicketInput } from "@/shared/db/schema.zod";
import { TicketWithPayments } from "@/shared/db/service/ticket-service";

export async function patchTicket(
  id: string,
  patch: UpdateTicketInput,
): Promise<TicketWithPayments> {
  const response = await fetch(`/api/ticket/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    const errorResponse = await response.json().catch(() => null);
    throw new Error(errorResponse?.message || response.statusText);
  }

  return response.json();
}
