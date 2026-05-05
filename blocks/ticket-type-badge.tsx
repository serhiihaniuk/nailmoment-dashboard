"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils";
import { TICKET_TYPE } from "@/shared/const";

export const TICKET_TYPE_BADGE_COLORS = {
  standard: {
    background: "#e5f5eb",
    border: "#159447",
    foreground: "#0f7a3b",
  },
  maxi: {
    background: "#f3e3b3",
    border: "#8a6a3d",
    foreground: "#5b3327",
  },
  vip: {
    background: "#395500",
    border: "#395500",
    foreground: "#ffffff",
  },
} as const;

const getClasses = (type: string) => {
  switch (type?.toLowerCase()) {
    case "vip":
      return "border-[#395500] text-white bg-[#395500]";
    case "standard":
    case "standart":
      return "border-[#159447]/25 text-[#0f7a3b] bg-[#e5f5eb]";
    case TICKET_TYPE.MAXI:
      return "border-[#8a6a3d]/30 text-[#5b3327] bg-[#f3e3b3]";
    default:
      return "border-border text-muted-foreground bg-muted/20";
  }
};

const getLabel = (type: string) => {
  const normalizedType = type?.toLowerCase();

  if (normalizedType === "standard" || normalizedType === "standart") {
    return "STD";
  }

  return type;
};

export const TicketTypeBadge = ({ type }: { type: string }) => {
  const label = getLabel(type);

  return (
    <Badge
      variant="outline"
      className={cn(
        "py-0 px-1.5 uppercase text-[10px] font-semibold tracking-wide rounded",
        getClasses(type),
      )}
    >
      {label}
    </Badge>
  );
};
