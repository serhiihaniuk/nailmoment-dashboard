import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Pencil, Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentInstallment } from "@/shared/db/schema";
import { patchPaymentInstallmentSchema as patchServerSchema } from "@/shared/db/schema.zod";

const patchPaymentInstallmentSchema = patchServerSchema.refine(
  (data) => !(data.is_paid && !data.paid_date),
  {
    message: "Дата платежу обов'язкова, якщо позначено «Оплачено».",
    path: ["paid_date"],
  }
);

interface EditPaymentInstallmentDialogProps {
  payment: PaymentInstallment;
  isLoading?: boolean;
  onSave: (
    paymentId: string,
    data: z.infer<typeof patchPaymentInstallmentSchema>
  ) => Promise<void>;
}

export const EditPaymentInstallmentDialog: React.FC<
  EditPaymentInstallmentDialogProps
> = ({ payment, isLoading = false, onSave }) => {
  const [open, setOpen] = React.useState(false);

  const values = {
    amount: payment.amount?.toString() ?? "",
    due_date: payment.due_date ? payment.due_date.slice(0, 10) : undefined,
    paid_date: payment.paid_date ? payment.paid_date.slice(0, 10) : undefined,
    is_paid: payment.is_paid,
    invoice_requested: payment.invoice_requested,
    invoice_sent: payment.invoice_sent,
    nip: payment.nip ?? "",
    comment: payment.comment ?? "",
  };

  const form = useForm<z.infer<typeof patchPaymentInstallmentSchema>>({
    resolver: zodResolver(patchPaymentInstallmentSchema),
    defaultValues: values,
  });

  const handleSubmit = async (
    values: z.infer<typeof patchPaymentInstallmentSchema>
  ) => {
    await onSave(payment.id, {
      ...values,
      amount: values.amount ?? undefined,
      due_date: values.due_date,
      paid_date: values.paid_date,
      nip: values.nip?.trim(),
      comment: values.comment?.trim(),
    });
    setOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) form.reset(values);
    setOpen(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 p-1">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Редагування платежу</DialogTitle>
          <DialogDescription>
            Змініть дані платежу та натисніть «Зберегти».
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Сума (Zł)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* dates */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата очікуваного платежу</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paid_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата платежу</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || undefined)
                          }
                        />
                      </FormControl>

                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={() => field.onChange(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* toggles */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_paid"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm">Оплачено</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_requested"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm">Фактура запитана</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_sent"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="text-sm">
                      Фактура відправлена
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567890"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* comment */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Коментар</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Додаткові деталі…"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading || form.formState.isSubmitting}
              >
                {isLoading || form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Зберегти
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
