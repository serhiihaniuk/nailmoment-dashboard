export const TICKET_TYPE = {
  STANDARD: "standard",
  MAXI: "maxi",
  VIP: "vip",
} as const;

export const TICKET_TYPE_LIST = [
  TICKET_TYPE.STANDARD,
  TICKET_TYPE.MAXI,
  TICKET_TYPE.VIP,
] as const;

export type TicketGrade = (typeof TICKET_TYPE_LIST)[number];
