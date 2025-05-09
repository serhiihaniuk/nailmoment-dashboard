// components/add-battle-ticket-dialog.tsx (or your preferred location)
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/label"; // Assuming Field is a custom component
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // For comment
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BattleTicket } from "@/shared/db/schema"; // Ensure BattleTicket is exported
import { z } from "zod";
// Import the client schema for battle tickets
import {
  insertBattleTicketClientSchema,
  InsertBattleTicketClientInput,
} from "@/shared/db/schema.zod";

// Type for form state based on the client schema
type BattleTicketFormState = InsertBattleTicketClientInput;

// API response structure (matches your POST /api/battle-ticket response)
type ApiBattleTicketSuccess = {
  battleTicket: BattleTicket;
  mailSent: boolean;
  mailError: string | null;
};
// Generic API error structure
type ApiError = {
  message: string;
  errors?: Record<string, string[]> | z.ZodIssue[]; // Handle both flattened and raw Zod issues
};

async function addBattleTicket(
  body: BattleTicketFormState
): Promise<ApiBattleTicketSuccess> {
  const r = await fetch("/api/battle-ticket", {
    // Updated API endpoint
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) {
    console.error("Add Battle Ticket API Error:", json);
    throw json as ApiError;
  }
  return json as ApiBattleTicketSuccess;
}

// Default form state for battle tickets
const defaultBattleTicketForm: BattleTicketFormState = {
  name: "",
  email: "",
  phone: "",
  instagram: "",
  nomination_quantity: 1, // Default value
  comment: "",
};

export function AddBattleTicketDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BattleTicketFormState>(
    defaultBattleTicketForm
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof BattleTicketFormState, string>>
  >({});

  // Using local state for success indication to control button text and dialog closing
  const [mutationSuccessful, setMutationSuccessful] = useState(false);

  const handleInputChange = <K extends keyof BattleTicketFormState>(
    key: K,
    value: BattleTicketFormState[K]
  ) => {
    setForm((prevForm) => ({ ...prevForm, [key]: value }));
    // Clear specific field error on change
    if (errors[key]) {
      setErrors((prevErrors) => ({ ...prevErrors, [key]: undefined }));
    }
    // Reset overall success state if user starts typing again after a success
    if (mutationSuccessful) {
      setMutationSuccessful(false);
    }
  };

  const mutation = useMutation<
    ApiBattleTicketSuccess,
    ApiError,
    BattleTicketFormState
  >({
    mutationFn: addBattleTicket,
    onSuccess: () => {
      setErrors({});
      setMutationSuccessful(true);
      queryClient.invalidateQueries({ queryKey: ["battleTickets"] });
    },
    onError: (error: ApiError) => {
      setMutationSuccessful(false);
      if (error.errors) {
        const fieldErrors: Partial<
          Record<keyof BattleTicketFormState, string>
        > = {};
        if (Array.isArray(error.errors)) {
          // Raw Zod issues
          (error.errors as z.ZodIssue[]).forEach((issue) => {
            if (issue.path.length > 0) {
              fieldErrors[issue.path[0] as keyof BattleTicketFormState] =
                issue.message;
            }
          });
        } else {
          // Flattened errors
          for (const key in error.errors) {
            fieldErrors[key as keyof BattleTicketFormState] = (
              error.errors[key as keyof typeof error.errors] as string[]
            )[0];
          }
        }
        setErrors(fieldErrors);
      }
    },
  });

  // Effect to reset form and success state when dialog closes
  useEffect(() => {
    if (!open) {
      setForm(defaultBattleTicketForm);
      setErrors({});
      setMutationSuccessful(false); // Reset success state
    }
  }, [open]);

  const handleSubmit = () => {
    if (mutationSuccessful) {
      // If "Close" button is clicked after success
      setOpen(false);
      return;
    }

    const parsed = insertBattleTicketClientSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof BattleTicketFormState, string>> =
        {};
      parsed.error.errors.forEach((issue) => {
        if (issue.path.length > 0) {
          fieldErrors[issue.path[0] as keyof BattleTicketFormState] =
            issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({}); // Clear client-side errors before submitting
    mutation.mutate(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1">
          <Plus size={14} /> Додати Учасника Батлу
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px] top-4 translate-y-0 md:top-1/2 md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Новий Учасник Батлу</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Field label="Ім’я">
            <Input
              value={form.name}
              placeholder="Ім’я учасника"
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={mutation.isPending || mutationSuccessful}
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
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={mutation.isPending || mutationSuccessful}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </Field>

          <Field label="Телефон">
            <Input
              value={form.phone}
              placeholder="+48 888 999 666"
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={mutation.isPending || mutationSuccessful}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </Field>

          <Field label="Instagram">
            <Input
              value={form.instagram || ""}
              placeholder="battle_participant_insta"
              onChange={(e) => handleInputChange("instagram", e.target.value)}
              disabled={mutation.isPending || mutationSuccessful}
            />
            {errors.instagram && (
              <p className="text-xs text-destructive">{errors.instagram}</p>
            )}
          </Field>

          <Field label="Кількість номінацій">
            <Input
              type="number"
              min="1"
              value={form.nomination_quantity}
              onChange={(e) =>
                handleInputChange(
                  "nomination_quantity",
                  parseInt(e.target.value, 10) || 1
                )
              }
              disabled={mutation.isPending || mutationSuccessful}
            />
            {errors.nomination_quantity && (
              <p className="text-xs text-destructive">
                {errors.nomination_quantity}
              </p>
            )}
          </Field>

          <Field label="Коментар (опціонально)">
            <Textarea
              value={form.comment || ""}
              placeholder="Додаткова інформація..."
              onChange={(e) => handleInputChange("comment", e.target.value)}
              className="h-24"
              disabled={mutation.isPending || mutationSuccessful}
            />
            {errors.comment && (
              <p className="text-xs text-destructive">{errors.comment}</p>
            )}
          </Field>
        </div>

        {/* Removed custom StatusBanner, relying on toasts instead */}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : mutationSuccessful ? (
              "Закрити"
            ) : (
              "Створити Учасника"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
