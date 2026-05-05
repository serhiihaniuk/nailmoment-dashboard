import { BattleTicket } from "@/shared/db/schema";
import { UpdateBattleTicketInput } from "@/shared/db/schema.zod";

export type EditBattleTicketFormValues = Pick<
  UpdateBattleTicketInput,
  | "name"
  | "email"
  | "instagram"
  | "phone"
  | "nomination_quantity"
  | "comment"
  | "photos_sent"
>;

export type EditBattleTicketSource = Pick<
  BattleTicket,
  | "name"
  | "email"
  | "instagram"
  | "phone"
  | "nomination_quantity"
  | "comment"
  | "photos_sent"
>;

export function createEditBattleTicketDefaultValues(
  battleTicket: EditBattleTicketSource,
): EditBattleTicketFormValues {
  return {
    name: battleTicket.name,
    email: battleTicket.email,
    instagram: battleTicket.instagram,
    phone: battleTicket.phone,
    nomination_quantity: battleTicket.nomination_quantity,
    comment: battleTicket.comment ?? "",
    photos_sent: battleTicket.photos_sent,
  };
}

export function normalizeEditableNominationQuantity(value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}
