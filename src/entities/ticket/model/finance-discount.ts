import { normalizeMoneyString, toMoneyNumber } from "./ticket";

export type FinanceDiscountInputResult =
  | {
      amount: string;
      kind: "amount" | "percent";
      percent?: number;
    }
  | {
      error: string;
    };

const localizedNumberPattern = /[-+]?\d+(?:[,.]\d+)?/;

export function resolveFinanceDiscountInput(
  input: string,
  grossTotal: unknown
): FinanceDiscountInputResult {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      amount: "0.00",
      kind: "amount",
    };
  }

  const numericMatch = trimmedInput.match(localizedNumberPattern);
  if (!numericMatch) {
    return {
      error: "Введіть суму або відсоток",
    };
  }

  const numericValue = parseLocalizedNumber(numericMatch[0]);
  if (!Number.isFinite(numericValue)) {
    return {
      error: "Введіть коректне число",
    };
  }

  const positiveValue = Math.abs(numericValue);
  if (trimmedInput.includes("%")) {
    if (positiveValue > 100) {
      return {
        error: "Знижка не може бути більшою за 100%",
      };
    }

    return {
      amount: normalizeMoneyString((toMoneyNumber(grossTotal) * positiveValue) / 100),
      kind: "percent",
      percent: positiveValue,
    };
  }

  return {
    amount: normalizeMoneyString(positiveValue),
    kind: "amount",
  };
}

function parseLocalizedNumber(value: string): number {
  return Number(value.replace(",", "."));
}
