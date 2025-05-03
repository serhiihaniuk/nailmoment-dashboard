"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ticket } from "@/shared/db/schema";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import { z } from "zod";
import { insertTicketClientSchema } from "@/shared/db/schema.zod";

type FormState = z.infer<typeof insertTicketClientSchema>;

type ApiSuccess = {
  ticket: Ticket;
  mailSent: boolean;
  mailError: string | null;
};
type ApiError = { message: string; error?: unknown };

async function addTicket(body: FormState): Promise<ApiSuccess> {
  const r = await fetch("/api/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw json as ApiError;
  return json as ApiSuccess;
}

const defaultForm: FormState = {
  name: "",
  email: "",
  phone: "",
  instagram: "",
  grade: "guest",
};

export function AddTicketDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [serverStatus, setServerStatus] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const [isSuccess, setIsSuccess] = useState(false);

  const handle = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: addTicket,
    onSuccess: (d) => {
      setErrors({});
      setForm(defaultForm);
      setServerStatus(
        d.mailSent
          ? { type: "success", message: "Квиток створено й e-mail надіслано" }
          : {
              type: "warning",
              message: "Квиток створено, але e-mail не надіслано",
            }
      );
      setIsSuccess(true);
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setForm(defaultForm);
      setErrors({});
    },

    onError: (err: ApiError) => {
      if (Array.isArray(err.error)) {
        const fieldErrors: Partial<Record<keyof FormState, string>> = {};
        (err.error as z.ZodIssue[]).forEach((e) => {
          fieldErrors[e.path[0] as keyof FormState] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        setServerStatus({ type: "error", message: "Помилка сервера" });
      }
    },
  });

  const submit = () => {
    if (isSuccess) {
      setIsSuccess(false);
      setOpen(false);
      return;
    }

    const parsed = insertTicketClientSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      parsed.error.errors.forEach((e) => {
        fieldErrors[e.path[0] as keyof FormState] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setServerStatus(null);
    mutation.mutate(parsed.data);
  };

  const StatusBanner = () =>
    serverStatus ? (
      <div
        className={`flex items-start gap-2 rounded-md p-3 text-sm ${
          serverStatus.type === "success"
            ? "bg-emerald-50 text-emerald-900"
            : serverStatus.type === "warning"
              ? "bg-amber-50 text-amber-900"
              : "bg-red-50 text-red-900"
        }`}
      >
        {serverStatus.type === "success" && <CheckCircle size={16} />}
        {serverStatus.type === "warning" && <AlertTriangle size={16} />}
        {serverStatus.type === "error" && <XCircle size={16} />}
        <span className="leading-tight">{serverStatus.message}</span>
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1">
          <Plus size={14} /> Додати квиток
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px] top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Новий квиток</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Field label="Ім’я">
            <Input
              value={form.name}
              placeholder="Ім’я користувача"
              onChange={(e) => handle("name", e.target.value)}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </Field>

          <Field label="Email">
            <Input
              type="email"
              placeholder="example@example.com"
              value={form.email}
              onChange={(e) => handle("email", e.target.value)}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </Field>

          <Field label="Телефон">
            <Input
              value={form.phone}
              placeholder="+48 888 999 666"
              onChange={(e) => handle("phone", e.target.value)}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </Field>

          <Field label="Instagram">
            <Input
              value={form.instagram}
              placeholder="nail_moment_pl"
              onChange={(e) => handle("instagram", e.target.value)}
            />
            {errors.instagram && (
              <p className="text-xs text-destructive">{errors.instagram}</p>
            )}
          </Field>

          <Field label="Тип квитка">
            <Select
              value={form.grade}
              onValueChange={(v) => handle("grade", v as FormState["grade"])}
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
            {errors.grade && (
              <p className="text-xs text-destructive">{errors.grade}</p>
            )}
          </Field>
        </div>

        <StatusBanner />

        <DialogFooter>
          {
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : serverStatus?.type === "success" ? (
                "Закрити"
              ) : (
                "Створити"
              )}
            </Button>
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
