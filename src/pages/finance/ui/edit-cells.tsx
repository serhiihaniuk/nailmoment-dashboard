import { AlertCircle, CalendarIcon, Check, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/lib/cn';
import type { SaveStatus } from '../model/autosave-status';
import { formatDate, normalizeMoney, toDateInputValue } from '../model/utils';

export function PaymentField({
  label,
  children,
  className,
  compact = false,
  error,
  saveStatus,
}: {
  label: string;
  children: React.ReactNode;
  className?: string | undefined;
  compact?: boolean | undefined;
  error?: string | undefined;
  saveStatus?: SaveStatus | undefined;
}) {
  const fieldError =
    error ?? (saveStatus?.state === "error" ? saveStatus.message : undefined);

  return (
    <Field
      className={cn(compact && "gap-1.5", className)}
      data-invalid={Boolean(fieldError) || undefined}
    >
      <FieldLabel
        className={cn(
          "min-h-4 text-[11px] text-muted-foreground",
          compact && "min-h-3"
        )}
      >
        {label}
      </FieldLabel>
      <div className={cn("w-full space-y-0.5", compact && "space-y-0")}>
        {children}
        <SaveStatusLine
          status={saveStatus}
          className={compact ? "min-h-3" : undefined}
        />
      </div>
      <FieldError
        className={cn("mt-0 text-[11px]", compact && "leading-tight")}
        errors={fieldError ? [{ message: fieldError }] : []}
      />
    </Field>
  );
}

export function SaveStatusLine({
  status,
  className,
}: {
  status?: SaveStatus | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn("flex min-h-4 items-center", className)}
      aria-live="polite"
    >
      <SaveStatusIndicator status={status} />
    </div>
  );
}

export function SaveStatusIndicator({
  status,
}: {
  status?: SaveStatus | undefined;
}) {
  if (!status || status.state === "idle") return null;

  if (status.state === "saving") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Зберігається...
      </span>
    );
  }

  if (status.state === "saved") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-success">
        <Check className="h-3 w-3" />
        Збережено
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[11px] text-destructive"
      title={status.message}
    >
      <AlertCircle className="h-3 w-3" />
      Не збережено
    </span>
  );
}

export function ReadOnlyMoney({ value }: { value?: string | null }) {
  return (
    <Input
      readOnly
      tabIndex={-1}
      value={normalizeMoney(value ?? "0.00")}
      className="h-9 border-transparent bg-muted/30 px-2 text-right text-base tabular-nums shadow-none"
    />
  );
}
export function MoneyCell({
  value,
  placeholder = "0.00",
  disabled = false,
  onSave,
}: {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  return (
    <Input
      key={value}
      type="number"
      step="0.01"
      min="0"
      defaultValue={value}
      disabled={disabled}
      placeholder={placeholder}
      onBlur={(event) => {
        const nextValue = normalizeMoney(event.target.value);
        if (nextValue !== value) onSave(nextValue);
      }}
      className="border-transparent bg-white/40 px-1.5 text-right tabular-nums shadow-none hover:border-border/60 hover:bg-white"
    />
  );
}

export function TextCell({
  value,
  disabled = false,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  return (
    <Input
      key={value}
      type="text"
      defaultValue={value}
      disabled={disabled}
      onBlur={(event) => {
        const nextValue = event.target.value.trim();
        if (nextValue !== value) onSave(nextValue);
      }}
      className="border-transparent bg-white/40 px-1.5 shadow-none hover:border-border/60 hover:bg-white"
    />
  );
}

export function TextareaCell({
  value,
  disabled = false,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  return (
    <Textarea
      key={value}
      defaultValue={value}
      disabled={disabled}
      onBlur={(event) => {
        const nextValue = event.target.value.trim();
        if (nextValue !== value) onSave(nextValue);
      }}
      className="border-transparent bg-white/40 px-1.5 shadow-none hover:border-border/60 hover:bg-white"
    />
  );
}

export function DateCell({
  value,
  disabled = false,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between bg-white/40 px-2 text-base font-normal shadow-none",
            !value && "text-muted-foreground"
          )}
        >
          <span>{value ? formatDate(value) : "mm/dd/yyyy"}</span>
          <CalendarIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onSave(toDateInputValue(date));
          }}
        />
        {value && (
          <div className="border-t border-border/60 p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onSave("")}
            >
              Очистити
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function SmallSelect<TOption extends readonly { value: string; label: string }[]>({
  value,
  options,
  disabled = false,
  disabledValues,
  onChange,
}: {
  value: TOption[number]["value"];
  options: TOption;
  disabled?: boolean;
  disabledValues?: ReadonlySet<string>;
  onChange: (value: TOption[number]["value"]) => void;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) =>
        onChange(nextValue as TOption[number]["value"])
      }
    >
      <SelectTrigger
        className="h-9 w-full rounded-md bg-background text-base"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={disabledValues?.has(option.value) ?? false}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
