"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils";
import { TICKET_TYPE } from "@/shared/const";

const getClasses = (type: string) => {
  switch (type?.toLowerCase()) {
    case "vip":
      return "border-[#395500] text-white bg-[#395500] ring-1 ring-[#395500]/40";
    case "standard":
      return "border-border text-muted-foreground bg-muted/30";
    case TICKET_TYPE.MAXI:
      return "border-[#8a6a3d]/30 text-[#5b3327] bg-[#f3e3b3]";
    default:
      return "border-border text-muted-foreground bg-muted/20";
  }
};

export const TicketTypeBadge = ({ type }: { type: string }) => (
  <Badge
    variant="outline"
    className={cn(
      "py-0 px-1.5 uppercase text-[10px] font-semibold tracking-wide rounded",
      getClasses(type),
    )}
  >
    {type}
  </Badge>
);
