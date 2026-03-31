"use client";

import { cn } from "@/shared/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { FC } from "react";

export const NavLink: FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
}> = ({ href, children, className }) => {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      className={cn(
        "relative py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        pathname === href &&
          "font-semibold text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
};
