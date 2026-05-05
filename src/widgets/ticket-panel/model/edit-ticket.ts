import { Ticket } from "@/shared/db/schema";
import { UpdateTicketInput } from "@/shared/db/schema.zod";

export type EditTicketFormValues = Pick<
  UpdateTicketInput,
  "instagram" | "phone" | "comment" | "updated_grade" | "archived"
>;

export type EditTicketSource = Pick<
  Ticket,
  "instagram" | "phone" | "comment" | "updated_grade" | "grade" | "archived"
>;

export function createEditTicketDefaultValues(
  ticket: EditTicketSource,
): EditTicketFormValues {
  return {
    instagram: ticket.instagram,
    phone: ticket.phone,
    comment: ticket.comment ?? "",
    updated_grade: ticket.updated_grade ?? ticket.grade,
    archived: ticket.archived ?? false,
  };
}

export function createEditTicketPayload(
  values: EditTicketFormValues,
  ticket: Pick<EditTicketSource, "grade">,
): EditTicketFormValues {
  return {
    ...values,
    updated_grade:
      values.updated_grade && values.updated_grade !== ticket.grade
        ? values.updated_grade
        : null,
  };
}
