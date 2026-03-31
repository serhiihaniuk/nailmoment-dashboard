import { EditBattleTicketFormValues, EditBattleTicketSource } from "./types";

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
