"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatInstagramLink } from "@/shared/utils";
import { BattleTicket } from "@/shared/db/schema";
import { UpdateBattleTicketInput } from "@/shared/db/schema.zod";
import {
  Loader2,
  AlertTriangle,
  Ghost,
  Mail,
  Phone,
  Instagram,
  User,
  CalendarClock,
  Text,
  MailCheck,
  MailX,
  ListChecks,
  Camera,
  CameraOff,
} from "lucide-react";
import Link from "next/link";
import { EditBattleTicketDialog } from "@/blocks/edit-battle-ticket-dialog";

async function fetchBattleTicket(id: string): Promise<BattleTicket | null> {
  const r = await fetch(`/api/battle-ticket/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) {
    const errorText = await r.text();
    console.error("Fetch battle ticket error:", errorText);
    throw new Error(`Failed to fetch battle ticket: ${r.statusText}`);
  }
  return r.json();
}

async function patchBattleTicket(
  id: string,
  patch: UpdateBattleTicketInput,
): Promise<BattleTicket> {
  const r = await fetch(`/api/battle-ticket/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    let errorMessage = `Failed to update battle ticket: ${r.statusText}`;
    try {
      const errorResponse = await r.json();
      if (errorResponse && errorResponse.message) {
        errorMessage = errorResponse.message;
        if (errorResponse.errors) {
          const fieldErrors = Object.entries(errorResponse.errors)
            .map(
              ([field, errors]) =>
                `${field}: ${(errors as string[]).join(", ")}`,
            )
            .join("; ");
          errorMessage += ` (${fieldErrors})`;
        }
      }
    } catch (e) {
      console.error("Error parsing error response for patchBattleTicket:", e);
    }
    console.error("Patch battle ticket error:", r.status, errorMessage);
    throw new Error(errorMessage);
  }
  return r.json();
}

interface BattleTicketCardProps {
  battleTicketId: string;
}

export function BattleTicketCard({ battleTicketId }: BattleTicketCardProps) {
  const queryClient = useQueryClient();

  const {
    data: battleTicket,
    isLoading,
    isError,
    error,
  } = useQuery<BattleTicket | null, Error>({
    queryKey: ["battleTicket", battleTicketId],
    queryFn: () => fetchBattleTicket(battleTicketId),
  });

  const editMutation = useMutation<
    BattleTicket,
    Error,
    UpdateBattleTicketInput
  >({
    mutationFn: (patchData) => patchBattleTicket(battleTicketId, patchData),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({
        queryKey: ["battleTicket", battleTicketId],
      });
      queryClient.invalidateQueries({ queryKey: ["battleTickets"] });
      console.log(`Battle ticket "${updatedData.name}" updated successfully.`);
    },
    onError: (error) => {
      console.error("Failed to update battle ticket:", error.message);
    },
  });

  if (isError && !isLoading) {
    console.error("Error in BattleTicketCard query:", error);
  }

  return (
    <Card className="max-w-md mx-auto shadow-md dark:border-gray-700">
      <CardHeader
        className={cn("py-6 transition-colors duration-300", {
          "bg-green-100 dark:bg-green-900/30":
            battleTicket?.photos_sent === true,
          "bg-yellow-100 dark:bg-yellow-800/30":
            battleTicket?.photos_sent === false,
          "bg-gray-200 dark:bg-gray-700": battleTicket === undefined,
        })}
      >
        <CardTitle className="text-lg flex items-center gap-2">
          Учасник Батлу: {battleTicket?.name || "Завантаження..."}
          {battleTicket?.photos_sent ? (
            <Camera size={14} className="text-green-500" />
          ) : (
            <CameraOff size={14} className="text-red-500" />
          )}
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          #{battleTicketId}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 h-44 justify-center">
            <Skeleton className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Loader2
                className="animate-spin text-gray-500 dark:text-gray-400"
                size={24}
              />
            </Skeleton>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center text-center gap-2 text-red-600 dark:text-red-400 h-44 justify-center">
            <AlertTriangle size={20} />
            <span>Помилка завантаження даних учасника.</span>
            <span className="text-xs text-muted-foreground">
              {error?.message}
            </span>
          </div>
        )}
        {!isLoading && !isError && battleTicket === null && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground h-44 justify-center">
            <Ghost size={20} />
            <span>Учасника батлу не знайдено.</span>
          </div>
        )}
        {battleTicket && (
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <User size={14} className="text-gray-400 dark:text-gray-500" />
              Імʼя
            </div>
            <span className="dark:text-gray-50">{battleTicket.name}</span>

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Mail size={14} className="text-gray-400 dark:text-gray-500" />
              Електронна пошта
            </div>
            {battleTicket.email ? (
              <Link
                href={`mailto:${battleTicket.email}`}
                className="text-blue-600 hover:underline dark:text-blue-400 truncate"
              >
                {battleTicket.email}
              </Link>
            ) : (
              <span className="dark:text-gray-50">-</span>
            )}

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Instagram
                size={14}
                className="text-gray-400 dark:text-gray-500"
              />
              Instagram
            </div>
            <span>
              {battleTicket.instagram ? (
                <a
                  href={formatInstagramLink(battleTicket.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {battleTicket.instagram}
                </a>
              ) : (
                <span className="dark:text-gray-50">-</span>
              )}
            </span>

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Phone size={14} className="text-gray-400 dark:text-gray-500" />
              Телефон
            </div>
            {battleTicket.phone ? (
              <Link
                href={`tel:${battleTicket.phone.replace(/\s+/g, "")}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {battleTicket.phone.replace(/\s+/g, "")}
              </Link>
            ) : (
              <span className="dark:text-gray-50">-</span>
            )}

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <ListChecks
                size={14}
                className="text-gray-400 dark:text-gray-500"
              />
              Кількість номінацій
            </div>
            <span className="dark:text-gray-50">
              {battleTicket.nomination_quantity}
            </span>

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <CalendarClock
                size={14}
                className="text-gray-400 dark:text-gray-500"
              />
              Дата реєстрації
            </div>
            <span className="dark:text-gray-50">
              {new Date(battleTicket.date).toLocaleString("uk-UA")}
            </span>

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              {battleTicket.mail_sent ? (
                <MailCheck size={14} className="text-green-500" />
              ) : (
                <MailX size={14} className="text-yellow-500" />
              )}
              Email надіслано
            </div>
            <span className="dark:text-gray-50">
              {battleTicket.mail_sent ? "Так ✅" : "Ні ❌"}
            </span>

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300">
              {battleTicket.photos_sent ? (
                <Camera size={14} className="text-green-500" />
              ) : (
                <CameraOff size={14} className="text-red-500" />
              )}
              Фото Надіслано
            </div>
            <span className="dark:text-gray-50">
              {battleTicket.photos_sent ? "Так ✅" : "Ні ❌"}
            </span>

            <div className="font-medium flex items-center gap-2 text-gray-600 dark:text-gray-300 sm:col-span-2">
              <Text size={14} className="text-gray-400 dark:text-gray-500" />
              Коментар
            </div>
            <div className="sm:col-span-2 dark:text-gray-50 break-words">
              {battleTicket.comment || "-"}
            </div>
          </div>
        )}
      </CardContent>
      {battleTicket && (
        <CardFooter className="pt-4 flex justify-start">
          <EditBattleTicketDialog
            battleTicket={battleTicket}
            mutation={editMutation}
          />
        </CardFooter>
      )}
    </Card>
  );
}
