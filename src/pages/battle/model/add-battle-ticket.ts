import { z } from "zod";
import { insertBattleTicketClientSchema } from "@/shared/db/schema.zod";

export type AddBattleTicketFormInputValues = z.input<
  typeof insertBattleTicketClientSchema
>;

export type AddBattleTicketFormValues = z.output<
  typeof insertBattleTicketClientSchema
>;

export type AddBattleTicketFieldErrors = Partial<
  Record<keyof AddBattleTicketFormValues, string>
>;

export type AddBattleTicketApiError = {
  message: string;
  errors?: Record<string, string[] | undefined> | z.ZodIssue[];
};

export function createAddBattleTicketDefaultValues(): AddBattleTicketFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    instagram: "",
    nomination_quantity: 1,
    comment: "",
  };
}

export function mapAddBattleTicketApiErrors(
  error: AddBattleTicketApiError,
): AddBattleTicketFieldErrors {
  if (!error.errors) {
    return {};
  }

  if (Array.isArray(error.errors)) {
    return error.errors.reduce<AddBattleTicketFieldErrors>((acc, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        acc[fieldName as keyof AddBattleTicketFormValues] = issue.message;
      }

      return acc;
    }, {});
  }

  return Object.entries(error.errors).reduce<AddBattleTicketFieldErrors>(
    (acc, [fieldName, messages]) => {
      const message = messages?.[0];

      if (message) {
        acc[fieldName as keyof AddBattleTicketFormValues] = message;
      }

      return acc;
    },
    {},
  );
}

export function normalizeNominationQuantity(value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}
