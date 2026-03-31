import { cn } from "@/shared/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
      {...props}
    />
  );
}

export { Skeleton };
