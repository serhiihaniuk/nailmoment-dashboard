"use client";

import { useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import { TICKET_TYPE_LIST } from "@/shared/const";
import { useAddTicketDialog } from "../model/use-add-ticket-dialog";
import { StatusBanner } from "./status-banner";

export function AddTicketDialog() {
  const formId = useId();
  const {
    closeDialog,
    form,
    handleOpenChange,
    handleSubmit,
    isPending,
    isSuccess,
    isLocked,
    open,
    serverStatus,
  } = useAddTicketDialog();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1">
          <Plus size={14} /> Додати квиток
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-105 top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Новий квиток</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form id={formId} onSubmit={handleSubmit} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-left">Ім’я</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ім’я користувача"
                        disabled={isLocked}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-left">Email</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="example@example.com"
                        disabled={isLocked}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-left">Телефон</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+48 888 999 666"
                        disabled={isLocked}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-left">Instagram</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="nail_moment_pl"
                        disabled={isLocked}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-left">Тип квитка</FormLabel>
                  <div className="col-span-3">
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLocked}
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
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <StatusBanner status={serverStatus} />

        <DialogFooter>
          <Button
            type={isSuccess ? "button" : "submit"}
            form={isSuccess ? undefined : formId}
            onClick={isSuccess ? closeDialog : undefined}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : isSuccess ? (
              "Закрити"
            ) : (
              "Створити"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
