"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { insertTicketClientSchema } from "@/shared/db/schema.zod";
import { addTicket } from "../api/add-ticket";
import { createAddTicketDefaultValues, mapAddTicketApiErrors } from "./lib";
import {
  AddTicketApiError,
  AddTicketFormInputValues,
  AddTicketFormValues,
  AddTicketServerStatus,
} from "./types";

export function useAddTicketDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<AddTicketServerStatus>(null);

  const form = useForm<
    AddTicketFormInputValues,
    undefined,
    AddTicketFormValues
  >({
    resolver: zodResolver(insertTicketClientSchema),
    defaultValues: createAddTicketDefaultValues(),
  });

  const mutation = useMutation({
    mutationFn: addTicket,
    onSuccess: async ({ mailSent }) => {
      setServerStatus(
        mailSent
          ? { type: "success", message: "Квиток створено й e-mail надіслано" }
          : {
              type: "warning",
              message: "Квиток створено, але e-mail не надіслано",
            },
      );

      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: AddTicketApiError) => {
      const fieldErrors = mapAddTicketApiErrors(error);

      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([fieldName, message]) => {
          if (!message) {
            return;
          }

          form.setError(fieldName as keyof AddTicketFormInputValues, {
            type: "server",
            message,
          });
        });
        return;
      }

      setServerStatus({
        type: "error",
        message: error.message || "Помилка сервера",
      });
    },
  });

  const resetDialogState = () => {
    form.reset(createAddTicketDefaultValues());
    form.clearErrors();
    mutation.reset();
    setServerStatus(null);
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
    setServerStatus(null);
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
    serverStatus,
  };
}
