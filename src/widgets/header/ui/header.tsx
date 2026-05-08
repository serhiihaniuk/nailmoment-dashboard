"use client";

import { NavLink } from "./nav-link";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/cn";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Квитки" },
  { href: "/finance", label: "Фінанси" },
  { href: "/battle", label: "Батл" },
  { href: "/speaker_vote", label: "Спікери" },
  { href: "/audience-votes", label: "Votes" },
  { href: "/info", label: "Допомога" },
  { href: "/cookie-analytics", label: "Згоди" },
];

function isActiveRoute(pathname: string | null, href: string) {
  return pathname === href || (href === "/dashboard" && pathname?.startsWith("/ticket/"));
}

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 h-12 w-full border-b border-border/60 bg-background">
      <div className="page-container flex h-full items-center gap-4">
        <Link href="/dashboard" className="mr-4 flex items-center">
          <NailIcon className="w-16" />
        </Link>
        <nav className="hidden h-full items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <MobileNavMenu />
      </div>
    </header>
  );
};

function MobileNavMenu() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Відкрити навігацію"
          className="ml-auto md:hidden"
          size="icon"
          variant="ghost"
        >
          <MenuIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          {NAV_ITEMS.map((item) => (
            <DropdownMenuItem
              asChild
              className={cn(
                isActiveRoute(pathname, item.href) && "bg-accent text-accent-foreground"
              )}
              key={item.href}
            >
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NailIcon: React.FC<any> = ({ size = 30, className, ...props }) => {
  const height = typeof size === "string" ? size : `${size}px`;
  const width =
    typeof size === "string"
      ? `calc(${size} * (200 / 60))`
      : `${(size * 230) / 60}px`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 230 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect width="230" height="60" rx="10" fill="#111111" />

      <path
        d="M60.1796 51.5L36.9216 28.3V51.5H19.6376V8.348H37.6176L59.7736 30.446V8.348H77.0576V51.5H60.1796ZM116.114 34.216L110.198 21.108L104.224 34.216H116.114ZM124.002 51.5L121.044 45.062H99.2942L96.3362 51.5H78.6462L99.1202 8.348H122.03L142.736 51.5H124.002ZM161.998 8.348V51.5H144.308V8.348H161.998ZM168.949 8.348H186.639V38.044H212.159V51.5H168.949V8.348Z"
        fill="white"
      />
    </svg>
  );
};
