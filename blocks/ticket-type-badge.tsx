"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils";
import { TICKET_TYPE } from "@/shared/const";

const getClasses = (type: string) => {
  switch (type?.toLowerCase()) {
    case "vip":
      return "border-[#395500] text-white bg-[#395500]";
    case "standard":
      return "border-border text-muted-foreground bg-muted/30";
    case TICKET_TYPE.MAXI:
      return "border-foreground/15 text-foreground bg-foreground/5";
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
