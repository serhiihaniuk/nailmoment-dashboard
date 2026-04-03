"use client";

import React, { useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Ticket } from "@/shared/db/schema";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import { Textarea } from "@/components/ui/textarea";
import { TICKET_TYPE_LIST } from "@/shared/const";
import { useEditTicketDialog } from "../model/use-edit-ticket-dialog";

type EditTicketDialogProps = {
  ticket: Ticket;
  ticketId: string;
  trigger?: React.ReactNode;
};

export function EditTicketDialog({
  ticket,
  ticketId,
  trigger,
}: EditTicketDialogProps) {
  const formId = useId();
  const { form, handleOpenChange, handleSubmit, isPending, open } =
    useEditTicketDialog({
      ticket,
      ticketId,
    });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1">
            <Pencil size={14} /> Редагувати
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-105 top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Редагувати квиток</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form id={formId} onSubmit={handleSubmit} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <Field label="Instagram">
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <Field label="Телефон">
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="updated_grade"
              render={({ field }) => (
                <Field label="Тип квитка">
                  <Select
                    value={field.value ?? "guest"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TICKET_TYPE_LIST.map((type) => (
                        <SelectItem key={type} value={type}>
                          <TicketTypeBadge type={type} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <Field label="Коментар">
                  <FormControl>
                    <Textarea
                      {...field}
                      className="h-36"
                      value={field.value ?? ""}
                    />
                  </FormControl>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="archived"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-left">Видалено</Label>
                  <div className="col-span-3">
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Зберегти"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
