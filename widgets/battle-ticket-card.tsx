"use client";

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
import { DetailGrid, DetailItem } from "@/components/ui/detail-grid";
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
        className={cn("transition-all duration-500", {
          "bg-linear-to-br from-success/10 via-success/5 to-transparent":
            battleTicket?.photos_sent === true,
          "bg-linear-to-br from-warning/10 via-warning/5 to-transparent":
            battleTicket?.photos_sent === false,
          "bg-linear-to-br from-muted/40 to-transparent":
            battleTicket === undefined,
        })}
      >
        <CardTitle className="flex items-center gap-2">
          Учасник Батлу: {battleTicket?.name || "Завантаження..."}
          {battleTicket?.photos_sent ? (
            <Camera size={16} className="text-success" />
          ) : (
            <CameraOff size={16} className="text-destructive" />
          )}
        </CardTitle>
        <CardDescription>#{battleTicketId}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-6">
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
          <div className="flex flex-col items-center text-center gap-2 text-destructive font-medium h-44 justify-center">
            <AlertTriangle size={20} />
            <span>Помилка завантаження даних учасника.</span>
            <span className="text-xs text-muted-foreground">
              {error?.message}
            </span>
          </div>
        )}
        {!isLoading && !isError && battleTicket === null && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground font-medium h-44 justify-center">
            <Ghost size={20} />
            <span>Учасника батлу не знайдено.</span>
          </div>
        )}
        {battleTicket && (
          <DetailGrid className="animate-in-fade">
            <DetailItem
              icon={<User />}
              label="Імʼя"
              value={battleTicket.name}
            />
            <DetailItem
              icon={<Mail />}
              label="Електронна пошта"
              value={
                battleTicket.email ? (
                  <Link
                    href={`mailto:${battleTicket.email}`}
                    className={cn(linkStyles, "truncate")}
                  >
                    {battleTicket.email}
                  </Link>
                ) : (
                  "-"
                )
              }
            />
            <DetailItem
              icon={<Instagram />}
              label="Instagram"
              value={
                battleTicket.instagram ? (
                  <a
                    href={formatInstagramLink(battleTicket.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkStyles}
                  >
                    {battleTicket.instagram}
                  </a>
                ) : (
                  "-"
                )
              }
            />
            <DetailItem
              icon={<Phone />}
              label="Телефон"
              value={
                battleTicket.phone ? (
                  <Link
                    href={`tel:${battleTicket.phone.replace(/\s+/g, "")}`}
                    className={linkStyles}
                  >
                    {battleTicket.phone.replace(/\s+/g, "")}
                  </Link>
                ) : (
                  "-"
                )
              }
            />
            <DetailItem
              icon={<ListChecks />}
              label="Кількість номінацій"
              value={battleTicket.nomination_quantity.toString()}
            />
            <DetailItem
              icon={<CalendarClock />}
              label="Дата реєстрації"
              value={new Date(battleTicket.date).toLocaleString("uk-UA")}
            />
            <DetailItem
              icon={
                battleTicket.mail_sent ? (
                  <MailCheck size={16} className="text-success" />
                ) : (
                  <MailX size={16} className="text-warning" />
                )
              }
              label="Email надіслано"
              value={battleTicket.mail_sent ? "Так" : "Ні"}
            />
            <DetailItem
              icon={
                battleTicket.photos_sent ? (
                  <Camera size={16} className="text-success" />
                ) : (
                  <CameraOff size={16} className="text-destructive" />
                )
              }
              label="Фото надіслано"
              value={battleTicket.photos_sent ? "Так" : "Ні"}
            />
            <DetailItem
              icon={<Text />}
              label="Коментар"
              value={battleTicket.comment || "-"}
            />
          </DetailGrid>
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
