"use client";

import { useId } from "react";
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
import { Label } from "@/shared/ui/label";
import { Toggle } from "@/shared/ui/toggle";
import { Button } from "@/shared/ui/button";
import { Loader2, Pencil, Camera, CameraOff } from "lucide-react";
import { BattleTicket } from "@/shared/db/schema";
import { Textarea } from "@/shared/ui/textarea";
import { normalizeEditableNominationQuantity } from "../model/edit-battle-ticket";
import { useEditBattleTicketDialog } from "../model/use-edit-battle-ticket-dialog";

interface EditBattleTicketDialogProps {
  battleTicket: BattleTicket;
  battleTicketId: string;
}

export function EditBattleTicketDialog({
  battleTicket,
  battleTicketId,
}: EditBattleTicketDialogProps) {
  const formId = useId();
  const { form, handleOpenChange, handleSubmit, isPending, open } =
    useEditBattleTicketDialog({
      battleTicket,
      battleTicketId,
    });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Pencil size={14} /> Редагувати учасника
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-105 top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Редагувати дані учасника батлу</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-left">Ім&apos;я</Label>
                  <div className="col-span-3">
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-left">Email</Label>
                  <div className="col-span-3">
                    <FormControl>
                      <Input {...field} type="email" value={field.value ?? ""} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-left">Instagram</Label>
                  <div className="col-span-3">
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-left">Телефон</Label>
                  <div className="col-span-3">
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nomination_quantity"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-left">Кількість номінацій</Label>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        value={field.value ?? 0}
                        onChange={(event) =>
                          field.onChange(
                            normalizeEditableNominationQuantity(
                              event.target.value,
                            ),
                          )
                        }
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-left">Коментар</Label>
                  <div className="col-span-3">
                    <FormControl>
                      <Textarea
                        {...field}
                        className="h-24"
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photos_sent"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor="photos-sent-toggle">Статус фото</Label>
                  <FormControl>
                    <Toggle
                      id="photos-sent-toggle"
                      aria-label="Toggle photos sent status"
                      pressed={field.value === true}
                      onPressedChange={field.onChange}
                      variant="outline"
                      className="w-full data-[state=on]:bg-green-100 data-[state=on]:text-green-700 dark:data-[state=on]:bg-green-800 dark:data-[state=on]:text-green-200 data-[state=off]:bg-red-100 data-[state=off]:text-red-700 dark:data-[state=off]:bg-red-800 dark:data-[state=off]:text-red-200"
                    >
                      {field.value ? (
                        <Camera className="h-4 w-4 mr-2" />
                      ) : (
                        <CameraOff className="h-4 w-4 mr-2" />
                      )}
                      {field.value ? "Фото надіслано" : "Фото не надіслано"}
                    </Toggle>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Натисніть, щоб оновити статус.
                  </p>
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
              "Зберегти зміни"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
