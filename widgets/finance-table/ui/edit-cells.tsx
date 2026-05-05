import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/shared/utils';
import { formatDate, normalizeMoney, toDateInputValue } from '../model/utils';

export function PaymentField({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <Field className={className} data-invalid={Boolean(error) || undefined}>
      <FieldLabel className="text-[11px] text-muted-foreground">
        {label}
      </FieldLabel>
      {children}
      <FieldError className="text-[11px]" errors={error ? [{ message: error }] : []} />
    </Field>
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
              disabled={disabledValues?.has(option.value)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
