import { ReactNode } from "react";

interface DetailItemProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

export const DetailItem: React.FC<DetailItemProps> = ({
  icon,
  label,
  value,
}) => (
  <>
    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
      {icon} {label}
    </span>
    <span className="text-sm col-span-1 break-words flex items-center text-ellipsis overflow-hidden">
      {value}
    </span>
  </>
);
