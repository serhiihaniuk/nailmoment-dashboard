"use client";

import { z } from "zod";
import {
  parseBattleTicket,
  type BattleTicket,
} from "@/entities/battle-ticket";
import { EditBattleTicketFormValues } from "../model/edit-battle-ticket";

const patchBattleTicketErrorSchema = z.object({
  errors: z.record(z.array(z.string()).optional()).optional(),
  message: z.string().optional(),
});

export async function patchBattleTicket(
  id: string,
  patch: EditBattleTicketFormValues,
): Promise<BattleTicket> {
  const response = await fetch(`/api/battle-ticket/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    let errorMessage = `Failed to update battle ticket: ${response.statusText}`;

    try {
      const errorResponse: unknown = await response.json();
      const parsedError = patchBattleTicketErrorSchema.safeParse(errorResponse);

      if (parsedError.success && parsedError.data.message) {
        const { errors, message } = parsedError.data;
        errorMessage = message;

        if (errors) {
          const fieldErrors = Object.entries(errors)
            .map(
              ([field, errors]) =>
                `${field}: ${(errors ?? []).join(", ")}`,
            )
            .join("; ");

          errorMessage += ` (${fieldErrors})`;
        }
      }
    } catch (error) {
      console.error(
        "Error parsing error response for patchBattleTicket:",
        error,
      );
    }

    console.error("Patch battle ticket error:", response.status, errorMessage);
    throw new Error(errorMessage);
  }

  return parseBattleTicket(await response.json());
}
