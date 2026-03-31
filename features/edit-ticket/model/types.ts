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
