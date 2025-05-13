// src/components/ticket-payments.tsx
"use client";

import React from "react";
import { cn } from "@/shared/utils";
import {
  CreditCard,
  CircleDollarSign,
  CalendarClock,
  CheckCircle,
  XCircle,
  FileSignature,
  ReceiptText,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import { PaymentInstallment } from "@/shared/db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  InsertPaymentInstallmentInput,
  PatchPaymentInstallment,
} from "@/shared/db/schema.zod";
import { EditPaymentInstallmentDialog } from "./payment-installment-dialog";
import { AddPaymentInstallmentDialog } from "./add-payment-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface TicketPaymentsProps {
  ticketId: string;
  payments: PaymentInstallment[];
}

/* ---------------- API helpers ---------------- */
async function addPaymentApi(
  _ticketId: string,
  data: InsertPaymentInstallmentInput,
): Promise<PaymentInstallment> {
  const r = await fetch(`/api/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function updatePaymentApi(
  paymentId: string,
  data: PatchPaymentInstallment,
): Promise<PaymentInstallment> {
  const r = await fetch(`/api/payment/${paymentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function deletePaymentApi(paymentId: string): Promise<{ id: string }> {
  const r = await fetch(`/api/payment/${paymentId}`, {
    method: "DELETE",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ---------------- Component ---------------- */
export const TicketPayments: React.FC<TicketPaymentsProps> = ({
  ticketId,
  payments,
}) => {
  const qc = useQueryClient();

  /* ---------------- MUTATIONS ---------------- */
  const addPaymentMutation = useMutation({
    mutationFn: (data: InsertPaymentInstallmentInput) =>
      addPaymentApi(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: PatchPaymentInstallment;
    }) => updatePaymentApi(paymentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePaymentApi(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  /* ---------------- HANDLERS ---------------- */
  const handleAddPayment = async (data: InsertPaymentInstallmentInput) => {
    await addPaymentMutation.mutateAsync(data);
  };

  const handleUpdatePayment = async (
    paymentId: string,
    data: PatchPaymentInstallment,
  ) => {
    await updatePaymentMutation.mutateAsync({ paymentId, data });
  };

  const handleDeletePayment = async (paymentId: string) => {
    await deletePaymentMutation.mutateAsync(paymentId);
  };

  /* ---------------- RENDER ---------------- */
  return (
    <section className="space-y-4 border-t pt-4 mt-4">
      <header className="flex items-center justify-between gap-4">
        <h3 className="text-md font-semibold flex items-center gap-2">
          <CreditCard size={18} /> Платежі ({payments?.length || 0})
        </h3>
        <AddPaymentInstallmentDialog
          ticketId={ticketId}
          isLoading={addPaymentMutation.isPending}
          onSave={handleAddPayment}
        />
      </header>

      {(!payments || payments.length === 0) && (
        <p className="text-sm text-muted-foreground">
          Інформація про платежі відсутня.
        </p>
      )}

      <ul className="space-y-4">
        {payments.map((p, i) => {
          const dateLabel = p.is_paid
            ? "Сплачено:"
            : p.due_date
              ? "Очікується до:"
              : "Дата:";
          const dateValue = p.paid_date
            ? new Date(p.paid_date).toLocaleDateString("uk-UA")
            : p.due_date
              ? new Date(p.due_date).toLocaleDateString("uk-UA")
              : "N/A";

          return (
            <li
              key={p.id}
              className="rounded-lg border bg-slate-50 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                {/* details */}
                <div className="flex-1 space-y-2 text-sm">
                  {/* amount */}
                  <div className="flex items-center gap-2">
                    <CircleDollarSign size={14} className="text-gray-400" />
                    <span className="font-medium">Сума:</span>
                    <span>{p.amount} Zł</span>
                  </div>

                  {/* date */}
                  <div className="flex items-center gap-2">
                    <CalendarClock size={14} className="text-gray-400" />
                    <span className="font-medium">{dateLabel}</span>
                    <span>{dateValue}</span>
                  </div>

                  {/* status */}
                  <div className="flex items-center gap-2">
                    {p.is_paid ? (
                      <CheckCircle size={14} className="text-green-600" />
                    ) : (
                      <XCircle size={14} className="text-orange-600" />
                    )}
                    <span className="font-medium">Статус:</span>
                    <span
                      className={cn(
                        p.is_paid ? "text-green-600" : "text-orange-600",
                      )}
                    >
                      {p.is_paid ? "Оплачено" : "Не оплачено"}
                    </span>
                  </div>

                  {/* invoice */}
                  <div className="flex items-center gap-2">
                    <FileSignature size={14} className="text-gray-400" />
                    <span className="font-medium">Фактура:</span>
                    <span>
                      {p.invoice_requested
                        ? p.invoice_sent
                          ? "Відправлено ✅"
                          : "В обробці ⏳"
                        : "Не запитано"}
                    </span>
                  </div>

                  {/* nip – optional */}
                  {p.nip && p.nip.trim() !== "" && (
                    <div className="flex items-center gap-2">
                      <ReceiptText size={14} className="text-gray-400" />
                      <span className="font-medium">NIP:</span>
                      <span>{p.nip}</span>
                    </div>
                  )}

                  {/* comment – optional */}
                  {p.comment && p.comment.trim() !== "" && (
                    <div className="flex items-start gap-2">
                      <MessageSquareText
                        size={14}
                        className="text-gray-400 mt-0.5"
                      />
                      <span className="font-medium">Коментар:</span>
                      <span className="whitespace-pre-line">{p.comment}</span>
                    </div>
                  )}
                </div>

                {/* actions */}
                <div className="flex flex-col items-end gap-2">
                  <EditPaymentInstallmentDialog
                    payment={p}
                    onSave={handleUpdatePayment}
                  />

                  {i !== 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-1 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Видалити платіж?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Цю дію неможливо скасувати. Запис буде видалено
                            назавжди.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Скасувати</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePayment(p.id)}
                          >
                            Видалити
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                Створено: {new Date(p.created_at).toLocaleDateString("uk-UA")} |
                Оновлено: {new Date(p.updated_at).toLocaleDateString("uk-UA")}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
