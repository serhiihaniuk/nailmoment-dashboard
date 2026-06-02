import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/cn";
import {
  INVOICE_STATUS_OPTIONS,
  SALE_SOURCE_OPTIONS,
} from "../model/constants";
import type {
  InvoiceStatusFilter,
  SaleSourceFilter,
} from "../model/filters";
import type { PaymentStatusFilter as PaymentStatusFilterValue } from "../model/types";

type FilterOption<TValue extends string> = {
  label: string;
  value: TValue;
};

const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "Всі" },
  { value: "paid", label: "Оплачені" },
  { value: "partial", label: "Часткова" },
  { value: "pending", label: "Очікують" },
  { value: "overdue", label: "Прострочені" },
] satisfies FilterOption<PaymentStatusFilterValue>[];

const SALE_SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "Всі" },
  ...SALE_SOURCE_OPTIONS,
] satisfies FilterOption<SaleSourceFilter>[];

const INVOICE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Всі" },
  ...INVOICE_STATUS_OPTIONS,
] satisfies FilterOption<InvoiceStatusFilter>[];

export function FinanceFiltersToolbar({
  className,
  invoiceStatus,
  onInvoiceStatusChange,
  onPaymentStatusChange,
  onQueryChange,
  onSaleSourceChange,
  paymentStatus,
  query,
  saleSource,
}: {
  className?: string | undefined;
  invoiceStatus: InvoiceStatusFilter;
  onInvoiceStatusChange: (value: InvoiceStatusFilter) => void;
  onPaymentStatusChange: (value: PaymentStatusFilterValue) => void;
  onQueryChange: (value: string) => void;
  onSaleSourceChange: (value: SaleSourceFilter) => void;
  paymentStatus: PaymentStatusFilterValue;
  query: string;
  saleSource: SaleSourceFilter;
}) {
  return (
    <div
      className={cn(
        "flex-wrap items-center gap-x-1 gap-y-2 bg-white px-3 py-2",
        className
      )}
    >
      <div className="relative min-w-0 grow md:max-w-55">
        <Search
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
        <Input
          placeholder="Пошук..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-8 border-0 bg-transparent pl-7 text-base shadow-none placeholder:text-muted-foreground/40 md:text-[13px]"
        />
      </div>

      <FilterDivider />

      <SegmentedFilter
        value={paymentStatus}
        options={PAYMENT_STATUS_OPTIONS}
        onChange={onPaymentStatusChange}
      />

      <FilterDivider />

      <CompactFilterSelect
        label="Оплата"
        value={saleSource}
        options={SALE_SOURCE_FILTER_OPTIONS}
        onChange={onSaleSourceChange}
      />

      <FilterDivider />

      <CompactFilterSelect
        label="Фактура"
        value={invoiceStatus}
        options={INVOICE_STATUS_FILTER_OPTIONS}
        onChange={onInvoiceStatusChange}
      />
    </div>
  );
}

function SegmentedFilter<TValue extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: TValue) => void;
  options: readonly FilterOption<TValue>[];
  value: TValue;
}) {
  return (
    <div className="flex h-8 max-w-full items-center overflow-x-auto rounded-md border border-border/60">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-full shrink-0 px-3 text-[12px] transition-colors duration-150 whitespace-nowrap",
            value === option.value
              ? "bg-[#f5f5f5] font-medium text-foreground"
              : "bg-transparent font-normal text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            option.value !== "all" && "border-l border-border/60"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CompactFilterSelect<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: readonly FilterOption<TValue>[];
  value: TValue;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        const selectedOption = options.find(
          (option) => option.value === nextValue
        );
        onChange(selectedOption?.value ?? value);
      }}
    >
      <SelectTrigger className="h-8 gap-1 rounded-md border-0 bg-transparent px-2 text-[12px] shadow-none transition-colors hover:bg-muted/50">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function FilterDivider() {
  return <div className="mx-1 hidden h-4 w-px bg-border/50 sm:block" />;
}
