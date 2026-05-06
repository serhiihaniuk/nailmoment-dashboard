import type { TicketWithFinance } from "@/entities/ticket";

const curatedDiscountOptions = ["100.00", "10% Dishop"] as const;

export function buildDiscountOptions(
  _tickets: TicketWithFinance[]
): string[] {
  return [...curatedDiscountOptions];
}
