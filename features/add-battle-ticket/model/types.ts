import { z } from "zod";
import { InsertBattleTicketClientInput } from "@/shared/db/schema.zod";

export type AddBattleTicketFormValues = InsertBattleTicketClientInput;

export type AddBattleTicketFieldErrors = Partial<
  Record<keyof AddBattleTicketFormValues, string>
>;

export type AddBattleTicketApiError = {
  message: string;
  errors?: Record<string, string[] | undefined> | z.ZodIssue[];
};
