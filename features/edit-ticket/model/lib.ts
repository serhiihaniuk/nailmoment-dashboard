import { EditTicketFormValues, EditTicketSource } from "./types";

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
