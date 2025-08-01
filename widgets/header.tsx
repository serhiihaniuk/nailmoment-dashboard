import { NavLink } from "@/blocks/nav-link";
import { cn } from "@/shared/utils";
import Link from "next/link";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 h-full w-full max-w-xl px-2 mx-auto">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <NailIcon className="w-20" />
        </Link>
        <NavLink href="/dashboard" className="flex items-center space-x-2">
          Квитки
        </NavLink>
        <NavLink href="/battle" className="flex items-center space-x-2">
          Батл
        </NavLink>
        <NavLink href="/speaker_vote" className="flex items-center space-x-2">
          Спікер
        </NavLink>
      </div>
    </header>
  );
};

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
      <rect width="230" height="60" rx="10" fill="#F07706" />

      <path
        d="M60.1796 51.5L36.9216 28.3V51.5H19.6376V8.348H37.6176L59.7736 30.446V8.348H77.0576V51.5H60.1796ZM116.114 34.216L110.198 21.108L104.224 34.216H116.114ZM124.002 51.5L121.044 45.062H99.2942L96.3362 51.5H78.6462L99.1202 8.348H122.03L142.736 51.5H124.002ZM161.998 8.348V51.5H144.308V8.348H161.998ZM168.949 8.348H186.639V38.044H212.159V51.5H168.949V8.348Z"
        fill="white"
      />
    </svg>
  );
};
