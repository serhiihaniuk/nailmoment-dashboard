import type { TicketGrade } from "@/shared/db/ticket-grade";

export { TICKET_TYPE, TICKET_TYPE_LIST } from "@/shared/db/ticket-grade";
export type { TicketGrade } from "@/shared/db/ticket-grade";

export const TICKET_PRICE_BY_GRADE: Record<TicketGrade, string> = {
  standard: "399.00",
  maxi: "590.00",
  vip: "949.00",
};
