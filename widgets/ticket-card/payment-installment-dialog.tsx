// src/components/payment-installment-dialog.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UpdatePaymentInstallmentInput,
  updatePaymentInstallmentClientSchema,
} from "@/shared/db/schema.zod";
import { PaymentInstallment } from "@/shared/db/schema";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid } from "date-fns"; // Added isValid
import { uk } from "date-fns/locale";
import { cn } from "@/shared/utils";
import { z } from "zod";

interface PaymentInstallmentDialogProps {
  payment: PaymentInstallment;
  onSave: (
    paymentId: string,
    data: UpdatePaymentInstallmentInput
  ) => Promise<unknown>;
  triggerButton: React.ReactNode;
  isLoading?: boolean;
}

export const PaymentInstallmentDialog: React.FC<
  PaymentInstallmentDialogProps
> = ({ payment, onSave, triggerButton, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);

  type FormData = z.infer<typeof updatePaymentInstallmentClientSchema>;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(updatePaymentInstallmentClientSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        amount: payment.amount,
        due_date: payment.due_date,
        paid_date: payment.paid_date,
        is_paid: payment.is_paid,
        invoice_requested: payment.invoice_requested,
        invoice_sent: payment.invoice_sent,
      });
    }
  }, [isOpen, payment, reset]);

  const onSubmit = async (data: FormData) => {
    await onSave(payment.id, data);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{"Редагувати платіж"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label
              htmlFor="amount"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Сума (грн)
            </Label>
            <Input
              id="amount"
              {...register("amount")}
              placeholder="Наприклад, 50.00"
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-500">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="due_date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Очікується до
            </Label>
            <Controller
              name="due_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value && isValid(new Date(field.value)) ? (
                        format(new Date(field.value), "PPP", { locale: uk })
                      ) : (
                        <span>Оберіть дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        field.value && isValid(new Date(field.value))
                          ? new Date(field.value)
                          : undefined
                      }
                      onSelect={(date) => field.onChange(date || null)} // Ensure null is passed if date is undefined
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.due_date && (
              <p className="mt-1 text-xs text-red-500">
                {errors.due_date.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="paid_date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Дата оплати
            </Label>
            <Controller
              name="paid_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value && isValid(new Date(field.value)) ? (
                        format(new Date(field.value), "PPP", { locale: uk })
                      ) : (
                        <span>Оберіть дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        field.value && isValid(new Date(field.value))
                          ? new Date(field.value)
                          : undefined
                      }
                      onSelect={(date) => field.onChange(date || null)} // Ensure null is passed
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.paid_date && (
              <p className="mt-1 text-xs text-red-500">
                {errors.paid_date.message}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Controller
                name="is_paid"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="is_paid_checkbox"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_paid_checkbox" className="font-normal">
                Оплачено
              </Label>
            </div>
            {errors.is_paid && (
              <p className="text-xs text-red-500">{errors.is_paid.message}</p>
            )}

            <div className="flex items-center space-x-2">
              <Controller
                name="invoice_requested"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="invoice_requested_checkbox"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label
                htmlFor="invoice_requested_checkbox"
                className="font-normal"
              >
                Рахунок запитано
              </Label>
            </div>
            {errors.invoice_requested && (
              <p className="text-xs text-red-500">
                {errors.invoice_requested.message}
              </p>
            )}

            <div className="flex items-center space-x-2">
              <Controller
                name="invoice_sent"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="invoice_sent_checkbox"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="invoice_sent_checkbox" className="font-normal">
                Рахунок відправлено
              </Label>
            </div>
            {errors.invoice_sent && (
              <p className="text-xs text-red-500">
                {errors.invoice_sent.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Скасувати
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зберегти зміни
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
