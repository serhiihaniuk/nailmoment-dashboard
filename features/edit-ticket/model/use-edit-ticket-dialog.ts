"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Ticket } from "@/shared/db/schema";
import { createEditTicketDefaultValues, createEditTicketPayload } from "./lib";
import { EditTicketFormValues } from "./types";
import { patchTicket } from "../api/patch-ticket";

interface UseEditTicketDialogParams {
  ticket: Ticket;
  ticketId: string;
}

export function useEditTicketDialog({
  ticket,
  ticketId,
}: UseEditTicketDialogParams) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<EditTicketFormValues>({
    defaultValues: createEditTicketDefaultValues(ticket),
  });

  const mutation = useMutation({
    mutationFn: (values: EditTicketFormValues) =>
      patchTicket(ticketId, createEditTicketPayload(values, ticket)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["tickets"] }),
      ]);

      setOpen(false);
      form.reset(createEditTicketDefaultValues(ticket));
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      form.reset(createEditTicketDefaultValues(ticket));
      mutation.reset();
      return;
    }

    mutation.reset();
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
