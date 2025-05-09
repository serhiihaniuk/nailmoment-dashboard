// components/edit-battle-ticket-dialog.tsx (or your preferred location)
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
import { Field } from "@/components/ui/label"; // Assuming Field is a custom component combining Label and input container
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { BattleTicket } from "@/shared/db/schema"; // Ensure BattleTicket is exported
import { UpdateBattleTicketInput } from "@/shared/db/schema.zod"; // Ensure this type is exported
import { Textarea } from "@/components/ui/textarea";

interface EditBattleTicketDialogProps {
  battleTicket: BattleTicket;
  mutation: UseMutationResult<BattleTicket, Error, UpdateBattleTicketInput>; // Assuming mutation returns BattleTicket
}

export function EditBattleTicketDialog({
  battleTicket,
  mutation,
}: EditBattleTicketDialogProps) {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<UpdateBattleTicketInput>({
    name: battleTicket.name,
    email: battleTicket.email,
    instagram: battleTicket.instagram,
    phone: battleTicket.phone,
    nomination_quantity: battleTicket.nomination_quantity,
    comment: battleTicket.comment ?? "",
  });

  useEffect(() => {
    if (mutation.isSuccess && open) {
      setOpen(false);
    }
  }, [mutation.isSuccess, open]);

  useEffect(() => {
    if (open) {
      setForm({
        name: battleTicket.name,
        email: battleTicket.email,
        instagram: battleTicket.instagram,
        phone: battleTicket.phone,
        nomination_quantity: battleTicket.nomination_quantity,
        comment: battleTicket.comment ?? "",
        // archived: battleTicket.archived,
      });
    }
  }, [open, battleTicket]);

  const handleChange = <K extends keyof UpdateBattleTicketInput>(
    key: K,
    value: UpdateBattleTicketInput[K]
  ) => {
    setForm((prevForm) => ({ ...prevForm, [key]: value }));
  };

  const handleSubmit = () => {
    // Construct the payload with only changed values or all, depending on preference
    // Ensure numeric fields are numbers
    const payload: UpdateBattleTicketInput = {
      ...form,
      nomination_quantity: Number(form.nomination_quantity) || 0, // Ensure it's a number
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              className="h-36"
              value={form.comment ?? ""}
              onChange={(e) => handleChange("comment", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !mutation}
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
