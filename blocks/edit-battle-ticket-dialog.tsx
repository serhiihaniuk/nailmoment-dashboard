// components/edit-battle-ticket-dialog.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Camera, CameraOff } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { BattleTicket } from "@/shared/db/schema";
import { UpdateBattleTicketInput } from "@/shared/db/schema.zod";
import { Textarea } from "@/components/ui/textarea";

interface EditBattleTicketDialogProps {
  battleTicket: BattleTicket;
  mutation: UseMutationResult<BattleTicket, Error, UpdateBattleTicketInput>;
}

export function EditBattleTicketDialog({
  battleTicket,
  mutation,
}: EditBattleTicketDialogProps) {
  const [open, setOpen] = useState(false);

  // Initial form state should be set once or when battleTicket changes if dialog is not open
  const [form, setForm] = useState<UpdateBattleTicketInput>({
    name: battleTicket.name,
    email: battleTicket.email,
    instagram: battleTicket.instagram,
    phone: battleTicket.phone,
    nomination_quantity: battleTicket.nomination_quantity,
    comment: battleTicket.comment ?? "",
    photos_sent: battleTicket.photos_sent,
  });

  // Effect to close dialog on successful mutation
  useEffect(() => {
    if (mutation.isSuccess && open) {
      mutation.reset();
      setOpen(false);
    }
  }, [mutation, mutation.isSuccess, open]); // Removed mutation.reset from here to avoid race conditions

  // Effect to reset form when dialog opens AND battleTicket data has changed
  // or just when it opens to ensure fresh state
  useEffect(() => {
    if (open) {
      setForm({
        name: battleTicket.name,
        email: battleTicket.email,
        instagram: battleTicket.instagram,
        phone: battleTicket.phone,
        nomination_quantity: battleTicket.nomination_quantity,
        comment: battleTicket.comment ?? "",
        photos_sent: battleTicket.photos_sent,
      });
    }
  }, [open, battleTicket]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset mutation state when dialog is closed
      mutation.reset();
    }
  };

  const handleChange = <K extends keyof UpdateBattleTicketInput>(
    key: K,
    value: UpdateBattleTicketInput[K]
  ) => {
    setForm((prevForm) => ({ ...prevForm, [key]: value }));
  };

  const handleSubmit = () => {
    const payload: UpdateBattleTicketInput = {
      ...form,
      nomination_quantity: Number(form.nomination_quantity) || 0,
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {" "}
      {/* Use handleOpenChange */}
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Pencil size={14} /> Редагувати Учасника
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Редагувати дані учасника батлу</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Field label="Ім'я">
            <Input
              value={form.name ?? ""}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </Field>
          <Field label="Instagram">
            <Input
              value={form.instagram ?? ""}
              onChange={(e) => handleChange("instagram", e.target.value)}
            />
          </Field>
          <Field label="Телефон">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </Field>
          <Field label="Кількість номінацій">
            <Input
              type="number"
              min="0"
              value={form.nomination_quantity ?? 0}
              onChange={(e) =>
                handleChange(
                  "nomination_quantity",
                  parseInt(e.target.value, 10) || 0
                )
              }
            />
          </Field>
          <Field label="Коментар">
            <Textarea
              className="h-24"
              value={form.comment ?? ""}
              onChange={(e) => handleChange("comment", e.target.value)}
            />
          </Field>
          <div className="space-y-2">
            <Label htmlFor="photos-sent-toggle">Статус відправки фото</Label>
            <Toggle
              id="photos-sent-toggle"
              aria-label="Toggle photos sent status"
              pressed={form.photos_sent}
              onPressedChange={(pressed) =>
                handleChange("photos_sent", pressed)
              }
              variant="outline"
              className="w-full data-[state=on]:bg-green-100 data-[state=on]:text-green-700 dark:data-[state=on]:bg-green-800 dark:data-[state=on]:text-green-200 data-[state=off]:bg-red-100 data-[state=off]:text-red-700 dark:data-[state=off]:bg-red-800 dark:data-[state=off]:text-red-200"
            >
              {form.photos_sent ? (
                <Camera className="h-4 w-4 mr-2" />
              ) : (
                <CameraOff className="h-4 w-4 mr-2" />
              )}
              {form.photos_sent ? "Фото Надіслано" : "Фото Не Надіслано"}
            </Toggle>
            <p className="text-xs text-muted-foreground">
              Натисніть, щоб змінити статус.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            // Disable button if mutation is pending.
            // The `!mutation` part of your original disabled condition is unusual;
            // mutation object should always exist.
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Зберегти Зміни"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
