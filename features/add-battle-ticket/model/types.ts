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
