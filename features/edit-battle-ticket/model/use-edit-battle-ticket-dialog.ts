"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BattleTicket } from "@/shared/db/schema";
import { patchBattleTicket } from "../api/patch-battle-ticket";
import { createEditBattleTicketDefaultValues } from "./lib";
import { EditBattleTicketFormValues } from "./types";

interface UseEditBattleTicketDialogParams {
  battleTicket: BattleTicket;
  battleTicketId: string;
}

export function useEditBattleTicketDialog({
  battleTicket,
  battleTicketId,
}: UseEditBattleTicketDialogParams) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<EditBattleTicketFormValues>({
    defaultValues: createEditBattleTicketDefaultValues(battleTicket),
  });

  const resetDialogState = () => {
    form.reset(createEditBattleTicketDefaultValues(battleTicket));
  };

  const mutation = useMutation({
    mutationFn: (values: EditBattleTicketFormValues) =>
      patchBattleTicket(battleTicketId, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["battleTicket", battleTicketId],
        }),
        queryClient.invalidateQueries({ queryKey: ["battleTickets"] }),
      ]);

      setOpen(false);
      resetDialogState();
    },
    onError: (error: Error) => {
      console.error("Failed to update battle ticket:", error.message);
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    mutation.reset();

    if (nextOpen) {
      resetDialogState();
      return;
    }

    resetDialogState();
  };

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  return {
    form,
    handleOpenChange,
    handleSubmit,
    isPending: mutation.isPending,
    open,
  };
}
