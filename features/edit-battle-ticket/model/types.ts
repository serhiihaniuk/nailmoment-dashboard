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
