"use client";

import { BattleTicket } from "@/shared/db/schema";
import { EditBattleTicketFormValues } from "../model/types";

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
      const errorResponse = await response.json();

      if (errorResponse?.message) {
        errorMessage = errorResponse.message;

        if (errorResponse.errors) {
          const fieldErrors = Object.entries(errorResponse.errors)
            .map(
              ([field, errors]) =>
                `${field}: ${(errors as string[]).join(", ")}`,
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

  return response.json();
}
