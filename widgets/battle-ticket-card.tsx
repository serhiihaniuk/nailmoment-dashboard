"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatInstagramLink, linkStyles } from "@/shared/utils";
import { BattleTicket } from "@/shared/db/schema";
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
import { EditBattleTicketDialog } from "@/features/edit-battle-ticket";

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

interface BattleTicketCardProps {
  battleTicketId: string;
}

export function BattleTicketCard({ battleTicketId }: BattleTicketCardProps) {
  const {
    data: battleTicket,
    isLoading,
    isError,
    error,
  } = useQuery<BattleTicket | null, Error>({
    queryKey: ["battleTicket", battleTicketId],
    queryFn: () => fetchBattleTicket(battleTicketId),
  });

  if (isError && !isLoading) {
    console.error("Error in BattleTicketCard query:", error);
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader
        className={cn("py-6 transition-colors duration-300", {
          "bg-emerald-50": battleTicket?.photos_sent === true,
          "bg-amber-50": battleTicket?.photos_sent === false,
          "bg-muted": battleTicket === undefined,
        })}
      >
        <CardTitle className="text-lg flex items-center gap-2">
          Учасник Батлу: {battleTicket?.name || "Завантаження..."}
          {battleTicket?.photos_sent ? (
            <Camera size={14} className="text-emerald-600" />
          ) : (
            <CameraOff size={14} className="text-red-600" />
          )}
        </CardTitle>
        <CardDescription>
          #{battleTicketId}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 h-44 justify-center">
            <Skeleton className="h-full w-full flex items-center justify-center">
              <Loader2
                className="animate-spin text-muted-foreground"
                size={24}
              />
            </Skeleton>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center text-center gap-2 text-red-600 h-44 justify-center">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <span className="font-medium text-muted-foreground flex items-center gap-2">
              <User size={14} className="text-muted-foreground" />
              Імʼя
            </span>
            <span>{battleTicket.name}</span>

            <span className="font-medium text-muted-foreground flex items-center gap-2">
              <Mail size={14} className="text-muted-foreground" />
              Електронна пошта
            </span>
            {battleTicket.email ? (
              <Link
                href={`mailto:${battleTicket.email}`}
                className={cn(linkStyles, "truncate")}
              >
                {battleTicket.email}
              </Link>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}

            <span className="font-medium text-muted-foreground flex items-center gap-2">
              <Instagram size={14} className="text-muted-foreground" />
              Instagram
            </span>
            <span>
              {battleTicket.instagram ? (
                <a
                  href={formatInstagramLink(battleTicket.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkStyles}
                >
                  {battleTicket.instagram}
                </a>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </span>

            <span className="font-medium text-muted-foreground flex items-center gap-2">
              <Phone size={14} className="text-muted-foreground" />
              Телефон
            </span>
            {battleTicket.phone ? (
              <Link
                href={`tel:${battleTicket.phone.replace(/\s+/g, "")}`}
                className={linkStyles}
              >
                {battleTicket.phone.replace(/\s+/g, "")}
              </Link>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}

            <span className="font-medium text-muted-foreground flex items-center gap-2">
              <ListChecks size={14} className="text-muted-foreground" />
              Кількість номінацій
            </span>
            <span>{battleTicket.nomination_quantity}</span>

            <span className="font-medium text-muted-foreground flex items-center gap-2">
              <CalendarClock size={14} className="text-muted-foreground" />
              Дата реєстрації
            </span>
            <span>
              {new Date(battleTicket.date).toLocaleString("uk-UA")}
            </span>

            <span className="font-medium text-muted-foreground flex items-center gap-2">
              {battleTicket.mail_sent ? (
                <MailCheck size={14} className="text-emerald-600" />
              ) : (
                <MailX size={14} className="text-amber-600" />
              )}
              Email надіслано
            </span>
            <span>
              {battleTicket.mail_sent ? "Так" : "Ні"}
            </span>

            <span className="font-medium text-muted-foreground flex items-center gap-2">
              {battleTicket.photos_sent ? (
                <Camera size={14} className="text-emerald-600" />
              ) : (
                <CameraOff size={14} className="text-red-600" />
              )}
              Фото Надіслано
            </span>
            <span>
              {battleTicket.photos_sent ? "Так" : "Ні"}
            </span>

            <span className="font-medium text-muted-foreground flex items-center gap-2 sm:col-span-2">
              <Text size={14} className="text-muted-foreground" />
              Коментар
            </span>
            <div className="sm:col-span-2 break-words">
              {battleTicket.comment || <span className="text-muted-foreground">-</span>}
            </div>
          </div>
        )}
      </CardContent>
      {battleTicket && (
        <CardFooter className="pt-4 flex justify-start">
          <EditBattleTicketDialog
            battleTicket={battleTicket}
            battleTicketId={battleTicketId}
          />
        </CardFooter>
      )}
    </Card>
  );
}
