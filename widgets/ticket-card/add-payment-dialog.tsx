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
import { Plus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertPaymentInstallmentApiInputSchema,
  InsertPaymentInstallmentInput,
} from "@/shared/db/schema.zod";

/* UI collects everything except ticket_id (added on submit) */
const paymentInstallmentFormSchema =
  insertPaymentInstallmentApiInputSchema.omit({
    ticket_id: true,
  });

type PaymentInstallmentFormValues = Omit<
  InsertPaymentInstallmentInput,
  "ticket_id"
>;

interface AddPaymentInstallmentDialogProps {
  ticketId: string;
  isLoading?: boolean;
  onSave: (data: InsertPaymentInstallmentInput) => Promise<void>;
}

export const AddPaymentInstallmentDialog: React.FC<
  AddPaymentInstallmentDialogProps
> = ({ ticketId, isLoading = false, onSave }) => {
  const [open, setOpen] = React.useState(false);

  const form = useForm<PaymentInstallmentFormValues>({
    resolver: zodResolver(paymentInstallmentFormSchema),
    defaultValues: {
      amount: "",
      due_date: undefined,
      paid_date: undefined,
      is_paid: false,
      invoice_requested: false,
      invoice_sent: false,
      nip: "",
      comment: "",
    },
  });

  const handleSubmit = async (values: PaymentInstallmentFormValues) => {
    await onSave({ ...values, ticket_id: ticketId });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Додати платіж
        </Button>
      </DialogTrigger>
      <DialogContent className="top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2 max-h-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новий платіж</DialogTitle>
          <DialogDescription>
            Заповніть дані платежу та натисніть «Створити».
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
                        className="w-min"
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
                    <FormLabel>Дата платежу (якщо вже сплачено)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="w-min"
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

            {/* nip */}
            <FormField
              control={form.control}
              name="nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP (для рахунку)</FormLabel>
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
                Створити
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
