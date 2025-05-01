"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils";

const getClasses = (type: string) => {
  switch (type?.toLowerCase()) {
    case "vip":
      return cn("bg-purple-700");
    case "standard":
      return cn("bg-indigo-600 text-white hover:bg-indigo-500");
    default:
      return cn("bg-teal-500 text-white hover:bg-teal-400");
  }
};

export const TicketTypeBadge = ({ type }: { type: string }) => (
  <Badge className={cn("py-0.5 px-2", getClasses(type))}>{type}</Badge>
);
