import * as React from "react";
import { cn } from "@/shared/utils";

export type DetailGridProps = React.HTMLAttributes<HTMLDivElement>;

export function DetailGrid({ className, ...props }: DetailGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 w-full",
        className,
      )}
      {...props}
    />
  );
}

export interface DetailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
}

export function DetailItem({
  icon,
  label,
  value,
  className,
  ...props
}: DetailItemProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)} {...props}>
      <div className="flex items-center gap-1.5 text-muted-foreground w-full">
        {icon && (
          <span className="opacity-60 shrink-0 [&>svg]:size-3.5">{icon}</span>
        )}
        <span className="text-label-caps">{label}</span>
      </div>
      <div className="text-body-base wrap-break-word w-full pl-5">
        {value !== undefined && value !== null && value !== "" ? (
          value
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    </div>
  );
}
