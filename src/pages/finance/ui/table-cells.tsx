import { TicketTypeBadge } from '@/entities/ticket/index.client';
import type { TicketWithFinance } from '@/entities/ticket';
import { cn } from '@/shared/lib/cn';
import type { PaymentStatusFilter as PaymentStatusFilterValue } from '../model/types';
import {
  getInvoiceCountsTitle,
  getTicketInvoiceCounts,
  pluralizeInvoiceRequested,
  pluralizeInvoiceSent,
} from '../model/utils';

export function PaymentStatusFilter({
  value,
  onChange,
}: {
  value: PaymentStatusFilterValue;
  onChange: (value: PaymentStatusFilterValue) => void;
}) {
  const options: { value: PaymentStatusFilterValue; label: string }[] = [
    { value: "all", label: "Всі" },
    { value: "paid", label: "Оплачені" },
    { value: "partial", label: "Часткова оплата" },
    { value: "pending", label: "Очікують оплату" },
    { value: "overdue", label: "Прострочені" },
  ];

  return (
    <div className="flex items-center gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors",
            value === option.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function InvoiceStatusCell({ ticket }: { ticket: TicketWithFinance }) {
  const counts = getTicketInvoiceCounts(ticket);
  const title = getInvoiceCountsTitle(counts);
  const rows = [
    counts.sent > 0
      ? {
          key: "sent",
          color: "bg-success",
          label: `${counts.sent} ${pluralizeInvoiceSent(counts.sent)}`,
        }
      : null,
    counts.requested > 0
      ? {
          key: "requested",
          color: "bg-[#f59e0b]",
          label: `${counts.requested} ${pluralizeInvoiceRequested(counts.requested)}`,
        }
      : null,
  ].filter(Boolean) as { key: string; color: string; label: string }[];

  const visibleRows =
    rows.length > 0
      ? rows
      : [{ key: "not_needed", color: "bg-muted-foreground/40", label: "Не запитана" }];

  return (
    <div className="inline-flex flex-col items-start gap-1 text-left" title={title}>
      {visibleRows.map((row) => (
        <span
          key={row.key}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", row.color)} />
          <span>{row.label}</span>
        </span>
      ))}
    </div>
  );
}

export function StatusIndicator({ status }: { status?: string | null }) {
  const config: Record<string, { color: string; label: string }> = {
    paid: { color: "bg-success", label: "Оплачено" },
    partial: { color: "bg-warning", label: "Частково" },
    overdue: { color: "bg-destructive", label: "Прострочено" },
    unpaid: { color: "bg-muted-foreground/30", label: "Очікує оплати" },
    untracked: { color: "bg-muted-foreground/20", label: "Без платежів" },
    pending: { color: "bg-muted-foreground/30", label: "Очікує оплати" },
    not_started: { color: "bg-muted-foreground/30", label: "Очікує оплати" },
  };

  const statusConfig = config[status ?? ""] ?? { color: "bg-muted-foreground/20", label: "—" };

  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full shrink-0", statusConfig.color)} />
      <span className="text-[12px] text-muted-foreground">{statusConfig.label}</span>
    </div>
  );
}

export function GradeMarker({ grade }: { grade?: string | null }) {
  if (!grade) return <span className="text-muted-foreground">—</span>;

  return <TicketTypeBadge type={grade} />;
}
