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
  const isActive = pathname === href || (href === "/dashboard" && pathname.startsWith("/ticket/"));

  return (
    <Link
      href={href}
      className={cn(
        "relative h-full flex items-center text-[13px] transition-colors duration-150",
        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground after:transition-all after:duration-150",
        isActive
          ? "font-medium text-foreground after:opacity-100"
          : "text-muted-foreground hover:text-foreground/70 after:opacity-0",
        className,
      )}
    >
      {children}
    </Link>
  );
};
