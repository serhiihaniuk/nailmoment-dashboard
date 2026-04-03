import { AddTicketApiError, AddTicketFieldErrors, AddTicketFormInputValues } from "./types";

export function createAddTicketDefaultValues(): AddTicketFormInputValues {
  return {
    name: "",
    email: "",
    phone: "",
    instagram: "",
    grade: "standard",
  };
}

export function mapAddTicketApiErrors(
  error: AddTicketApiError,
): AddTicketFieldErrors {
  if (!error.error) {
    return {};
  }

  if (Array.isArray(error.error)) {
    return error.error.reduce<AddTicketFieldErrors>((acc, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        acc[fieldName as keyof AddTicketFormInputValues] = issue.message;
      }

      return acc;
    }, {});
  }

  if (typeof error.error === "object") {
    return Object.entries(
      error.error as Record<string, string[] | undefined>,
    ).reduce<AddTicketFieldErrors>((acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message) {
        acc[fieldName as keyof AddTicketFormInputValues] = message;
      }

      return acc;
    }, {});
  }

  return {};
}
