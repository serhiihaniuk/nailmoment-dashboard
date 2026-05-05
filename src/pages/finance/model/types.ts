import type {
  INVOICE_STATUS_OPTIONS,
  PaymentPlan,
  SaleSource,
  TicketGrade,
} from './constants';

export type CreateTicketInput = {
  name: string;
  email: string;
  phone: string;
  instagram?: string | undefined;
  grade: TicketGrade;
};

export type CreateTicketWithFinanceInput = CreateTicketInput & {
  payment_sale_source: SaleSource;
  payment_plan: PaymentPlan;
  gross_total: string;
  discount_amount: string;
  tax_amount: string;
  nip: string;
  finance_note: string;
};

export type CreatedFinanceTicket = {
  id: string;
};

export type CreateTicketField = keyof CreateTicketWithFinanceInput;
export type FieldErrors<TField extends string = string> = Partial<Record<TField, string>>;

export type ApiIssue = {
  message?: string | undefined;
  path?: Array<string | number> | undefined;
};

export class ApiError extends Error {
  fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

export type PaymentStatusFilter = "all" | "paid" | "partial" | "overdue" | "pending";
export type InvoiceStatus = (typeof INVOICE_STATUS_OPTIONS)[number]["value"];
export type InvoiceCounts = Record<InvoiceStatus, number> & {
  total: number;
};
