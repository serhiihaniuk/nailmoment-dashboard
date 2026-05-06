"use client";

import React, { useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { Switch } from "@/shared/ui/switch";
import { type Ticket } from "@/entities/ticket";
import { TicketTypeBadge } from "@/entities/ticket/index.client";
import { Textarea } from "@/shared/ui/textarea";
import { TICKET_TYPE_LIST } from "@/entities/ticket";
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
            <Pencil data-icon="inline-start" /> Редагувати
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
                <Field>
                  <FieldLabel>Instagram</FieldLabel>
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
                <Field>
                  <FieldLabel>Телефон</FieldLabel>
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
                <Field>
                  <FieldLabel>Тип квитка</FieldLabel>
                  <Select
                    value={field.value ?? "standard"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {TICKET_TYPE_LIST.map((type) => (
                          <SelectItem key={type} value={type}>
                            <TicketTypeBadge type={type} />
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Коментар</FieldLabel>
                  <FormControl>
                    <Textarea
                      {...field}
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
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              "Зберегти"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
