"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { insertBattleTicketClientSchema } from "@/shared/db/schema.zod";
import { addBattleTicket } from "../api/add-battle-ticket";
import {
  createAddBattleTicketDefaultValues,
  mapAddBattleTicketApiErrors,
} from "./lib";
import {
  AddBattleTicketApiError,
  AddBattleTicketFormInputValues,
  AddBattleTicketFormValues,
} from "./types";

export function useAddBattleTicketDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<
    AddBattleTicketFormInputValues,
    undefined,
    AddBattleTicketFormValues
  >({
    resolver: zodResolver(insertBattleTicketClientSchema),
    defaultValues: createAddBattleTicketDefaultValues(),
  });

  const mutation = useMutation({
    mutationFn: addBattleTicket,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["battleTickets"] });
    },
    onError: (error: AddBattleTicketApiError) => {
      const fieldErrors = mapAddBattleTicketApiErrors(error);

      Object.entries(fieldErrors).forEach(([fieldName, message]) => {
        if (!message) {
          return;
        }

        form.setError(fieldName as keyof AddBattleTicketFormInputValues, {
          type: "server",
          message,
        });
      });
    },
  });

  const resetDialogState = () => {
    form.reset(createAddBattleTicketDefaultValues());
    form.clearErrors();
    mutation.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetDialogState();
    }

    setOpen(nextOpen);

    if (!nextOpen) {
      resetDialogState();
    }
  };

  const handleSubmit = form.handleSubmit((values) => {
    form.clearErrors();
    mutation.mutate(values);
  });

  return {
    closeDialog: () => handleOpenChange(false),
    form,
    handleOpenChange,
    handleSubmit,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isLocked: mutation.isPending || mutation.isSuccess,
    open,
  };
}
