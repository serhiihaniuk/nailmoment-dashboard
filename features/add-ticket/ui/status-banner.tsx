import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { AddTicketServerStatus } from "../model/types";

type StatusBannerProps = {
  status: AddTicketServerStatus;
};

export function StatusBanner({ status }: StatusBannerProps) {
  if (!status) {
    return null;
  }

  const statusConfig = {
    success: {
      icon: CheckCircle,
      className: "bg-emerald-50 text-emerald-900",
    },
    warning: {
      icon: AlertTriangle,
      className: "bg-amber-50 text-amber-900",
    },
    error: {
      icon: XCircle,
      className: "bg-red-50 text-red-900",
    },
  }[status.type];

  const Icon = statusConfig.icon;

  return (
    <div
      className={`flex items-start gap-2 rounded-md p-3 text-sm ${statusConfig.className}`}
    >
      <Icon size={16} />
      <span className="leading-tight">{status.message}</span>
    </div>
  );
}
