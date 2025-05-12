"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils";

const getClasses = (type: string) => {
  switch (type?.toLowerCase()) {
    case "vip":
      return cn(
        "border-purple-700 text-purple-800 bg-gradient-to-r from-orange-100 to-fuchsia-100"
      );
    case "standard":
      return cn("border-indigo-600 text-indigo-800 bg-indigo-50");
    default:
      return cn("border-teal-500 text-teal-800 bg-teal-50");
  }
};

export const TicketTypeBadge = ({ type }: { type: string }) => (
  <Badge
    variant="outline"
    className={cn(
      "py-0.5 px-2 w-18 uppercase text-[10px] font-bold",
      getClasses(type)
    )}
  >
    {type}
  </Badge>
);
