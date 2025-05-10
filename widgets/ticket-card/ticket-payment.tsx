// src/components/ticket-payments.tsx
"use client";

import React from "react";
import { cn } from "@/shared/utils";
import {
  CreditCard,
  Edit,
  CircleDollarSign, // For Payment Item
  CalendarClock, // For Payment Item
  CheckCircle, // For Payment Item
  XCircle, // For Payment Item
  FileSignature, // For Payment Item
} from "lucide-react";
import { PaymentInstallment } from "@/shared/db/schema"; // Drizzle type from your schema.ts
import { DetailItem } from "./detail-item"; // Assuming DetailItem is in the same directory or accessible
import { PaymentInstallmentDialog } from "./payment-installment-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  InsertPaymentInstallmentInput,
  UpdatePaymentInstallmentInput,
} from "@/shared/db/schema.zod"; // Zod types

interface TicketPaymentsProps {
  ticketId: string;
  payments: PaymentInstallment[];
}

async function addPaymentApi(
  ticketId: string,
  data: InsertPaymentInstallmentInput
): Promise<PaymentInstallment> {
  const r = await fetch(`/api/ticket/${ticketId}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function updatePaymentApi(
  paymentId: string,
  data: UpdatePaymentInstallmentInput
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

export const TicketPayments: React.FC<TicketPaymentsProps> = ({
  ticketId,
  payments,
}) => {
  const qc = useQueryClient();

  const addPaymentMutation = useMutation({
    mutationFn: (data: InsertPaymentInstallmentInput) =>
      addPaymentApi(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: UpdatePaymentInstallmentInput;
    }) => updatePaymentApi(paymentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePaymentApi(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });

  const handleAddPayment = async (data: InsertPaymentInstallmentInput) => {
    await addPaymentMutation.mutateAsync(data);
  };

  const handleUpdatePayment = async (
    paymentId: string,
    data: UpdatePaymentInstallmentInput
  ) => {
    await updatePaymentMutation.mutateAsync({ paymentId, data });
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (payments.length <= 1) {
      alert("Неможливо видалити останній платіж.");
      return;
    }
    await deletePaymentMutation.mutateAsync(paymentId);
  };

  return (
    <div className="space-y-1 border-t pt-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2">
          <CreditCard size={18} /> Платежі ({payments?.length || 0})
        </h3>
      </div>

      {!payments || payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Інформація про платежі відсутня.
        </p>
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-start gap-2 group border rounded-md bg-slate-50 p-3"
            >
              <div className="flex-grow text-sm">
                <div>
                  <PaymentInstallmentDialog
                    payment={payment}
                    isLoading={false}
                    onSave={handleUpdatePayment}
                    triggerButton={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-2">
                  <DetailItem
                    icon={
                      <CircleDollarSign size={14} className="text-gray-400" />
                    }
                    label="Сума"
                    value={`${payment.amount} грн`}
                  />
                  <DetailItem
                    icon={<CalendarClock size={14} className="text-gray-400" />}
                    label="Дата платежу"
                    value={
                      payment.paid_date
                        ? new Date(payment.paid_date).toLocaleDateString(
                            "uk-UA"
                          )
                        : payment.due_date
                          ? `Очікується до ${new Date(payment.due_date).toLocaleDateString("uk-UA")}`
                          : "N/A"
                    }
                  />
                  <DetailItem
                    label="Статус"
                    icon={
                      payment.is_paid ? (
                        <CheckCircle size={14} className="text-green-600" />
                      ) : (
                        <XCircle size={14} className="text-orange-600" />
                      )
                    }
                    value={
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          payment.is_paid ? "text-green-600" : "text-orange-600"
                        )}
                      >
                        {payment.is_paid ? "Оплачено" : "Не оплачено"}
                      </span>
                    }
                  />
                  <DetailItem
                    icon={<FileSignature size={14} className="text-gray-400" />}
                    label="Рахунок"
                    value={
                      payment.invoice_requested
                        ? payment.invoice_sent
                          ? "Відправлено ✅"
                          : "В обробці ⏳"
                        : "Не запитано"
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
