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
        {
          "font-bold": pathname === href,
        },
        className,
      )}
    >
      {children}
    </Link>
  );
};
