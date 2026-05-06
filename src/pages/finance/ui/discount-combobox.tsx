import { useState } from "react";
import {
  normalizeMoneyString,
  resolveFinanceDiscountInput,
} from "@/entities/ticket";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/shared/ui/combobox";

export function DiscountCombobox({
  value,
  grossTotal,
  options,
  disabled = false,
  onSave,
}: {
  value: string;
  grossTotal: string;
  options: readonly string[];
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const normalizedValue = normalizeMoneyString(value);

  return (
    <DiscountComboboxInput
      key={normalizedValue}
      value={normalizedValue}
      grossTotal={grossTotal}
      options={options}
      disabled={disabled}
      onSave={onSave}
    />
  );
}

function DiscountComboboxInput({
  value,
  grossTotal,
  options,
  disabled,
  onSave,
}: {
  value: string;
  grossTotal: string;
  options: readonly string[];
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const normalizedValue = normalizeMoneyString(value);
  const [inputValue, setInputValue] = useState(normalizedValue);
  const [error, setError] = useState<string | null>(null);

  const commitInput = (rawInput: string) => {
    const resolved = resolveFinanceDiscountInput(rawInput, grossTotal);
    if ("error" in resolved) {
      setError(resolved.error);
      return;
    }

    setError(null);
    setInputValue(resolved.amount);
    if (resolved.amount !== normalizedValue) {
      onSave(resolved.amount);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Combobox
        items={options}
        filter={null}
        inputValue={inputValue}
        value={inputValue}
        onInputValueChange={(nextInput, details) => {
          if (details.reason === "input-clear") {
            if (details.event.type === "base-ui") return;
            commitInput("");
            return;
          }

          if (details.reason === "input-change") {
            setInputValue(nextInput);
            setError(null);
          }
        }}
        onOpenChange={(open, details) => {
          if (
            !open &&
            inputValue !== normalizedValue &&
            (details.reason === "focus-out" ||
              details.reason === "outside-press")
          ) {
            commitInput(inputValue);
          }
        }}
        onValueChange={(nextValue) => {
          if (typeof nextValue === "string") {
            commitInput(nextValue);
          }
        }}
      >
        <ComboboxInput
          disabled={disabled}
          showClear={!disabled && inputValue !== "0.00" && inputValue !== ""}
          aria-invalid={Boolean(error)}
          placeholder="0 або 10%"
          className="w-full border-transparent bg-white/40 shadow-none hover:border-border/60 hover:bg-white [&_input]:text-right [&_input]:tabular-nums"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            commitInput(inputValue);
          }}
        />
        <ComboboxContent>
          <ComboboxEmpty>Немає варіантів</ComboboxEmpty>
          <ComboboxList>
            {(option: string) => (
              <ComboboxItem key={option} value={option}>
                {formatDiscountOptionLabel(option)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function formatDiscountOptionLabel(option: string): string {
  return option === "100.00" ? "100" : option;
}
