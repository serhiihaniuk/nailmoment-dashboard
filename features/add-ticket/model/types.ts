import { z } from "zod";
import { insertTicketClientSchema } from "@/shared/db/schema.zod";

export type AddTicketFormInputValues = z.input<typeof insertTicketClientSchema>;

export type AddTicketFormValues = z.output<typeof insertTicketClientSchema>;

export type AddTicketFieldErrors = Partial<
  Record<keyof AddTicketFormInputValues, string>
>;

export type AddTicketApiError = {
  message: string;
  error?: Record<string, string[] | undefined> | z.ZodIssue[] | unknown;
};

export type AddTicketServerStatus =
  | {
      type: "success" | "warning" | "error";
      message: string;
    }
  | null;
