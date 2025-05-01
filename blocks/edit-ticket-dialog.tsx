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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { Ticket } from "@/shared/db/schema";
import { UpdateTicketInput } from "@/shared/db/schema.zod";
import { TicketTypeBadge } from "./ticket-type-badge";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  ticket: Ticket;
  mutation: UseMutationResult<unknown, Error, UpdateTicketInput>;
};

export function EditTicketDialog({ ticket, mutation }: Props) {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<UpdateTicketInput>({
    instagram: ticket.instagram,
    phone: ticket.phone,
    comment: ticket.comment ?? "",
    updated_grade: ticket.updated_grade ?? ticket.grade,
  });

  useEffect(() => {
    if (mutation.isSuccess) setOpen(false);
  }, [mutation.isSuccess]);

  const handleChange = <K extends keyof UpdateTicketInput>(
    key: K,
    value: UpdateTicketInput[K]
  ) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = () => {
    const payload: UpdateTicketInput = {
      ...form,
      updated_grade:
        form.updated_grade && form.updated_grade !== ticket.grade
          ? form.updated_grade
          : null,
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Pencil size={14} /> Редагувати
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px] top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Редагувати квиток</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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
          <Field label="Тип квитка">
            <Select
              value={form.updated_grade ?? "guest"}
              onValueChange={(v) =>
                handleChange(
                  "updated_grade",
                  v as UpdateTicketInput["updated_grade"]
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["guest", "standard", "vip"].map((t) => (
                  <SelectItem key={t} value={t}>
                    <TicketTypeBadge type={t} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Коментар">
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => handleChange("comment", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? (
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

/* helper */
const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-4 items-center gap-4">
    <Label className="text-right">{label}</Label>
    <div className="col-span-3">{children}</div>
  </div>
);
