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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatInstagramLink } from "@/shared/utils";
import { Ticket } from "@/shared/db/schema";
import {
  Loader2,
  AlertTriangle,
  Ghost,
  Mail,
  Phone,
  Instagram,
  User,
  BadgeCheck,
  CalendarClock,
  ArrowBigDownDashIcon,
} from "lucide-react";

const getTicketTypeClasses = (ticketType: string) => {
  const base =
    "px-2.5 py-0.5 text-xs font-semibold transition-colors rounded-full";
  switch (ticketType?.toLowerCase()) {
    case "vip":
      return cn(
        base,
        "bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600"
      );
    case "standard":
      return cn(base, "bg-indigo-600 text-white hover:bg-indigo-500");
    default:
      return cn(base, "bg-teal-500 text-white hover:bg-teal-400");
  }
};

async function fetchTicket(id: string): Promise<Ticket | null> {
  const r = await fetch(`/api/ticket/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function patchArrived(id: string, arrived: boolean): Promise<Ticket> {
  const r = await fetch(`/api/ticket/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ arrived }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function TicketCard({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<Ticket | null, Error>({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (arrived: boolean) => patchArrived(ticketId, arrived),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  return (
    <Card className="max-w-md mx-auto shadow-xl">
      <CardHeader
        className={cn("py-6 transition-colors duration-300", {
          "bg-teal-100": data?.arrived,
          "bg-gray-300": !data?.arrived,
        })}
      >
        <CardTitle className="text-lg">
          Квиток {data?.name} {data?.arrived && "✅"}
        </CardTitle>
        <CardDescription>#{ticketId}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 h-44 justify-center">
            <Skeleton className="h-full w-full flex items-center justify-center">
              <Loader2 className="animate-spin" size={24} />
            </Skeleton>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-red-600 h-44 justify-center">
            <AlertTriangle size={20} />
            <span>Помилка завантаження квитка</span>
          </div>
        )}

        {!isError && !isLoading && data === null && (
          <div className="flex items-center gap-2 text-muted-foreground h-44 justify-center">
            <Ghost size={20} />
            <span>Квиток не знайдено</span>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <span className="font-medium flex items-center gap-2">
              <User size={14} className="text-gray-400" /> Імʼя
            </span>
            <span>{data.name}</span>

            <span className="font-medium flex items-center gap-2">
              <Mail size={14} className="text-gray-400" /> Email
            </span>
            <span>{data.email}</span>

            <span className="font-medium flex items-center gap-2">
              <Instagram size={14} className="text-gray-400" /> Instagram
            </span>
            <span>
              {data.instagram ? (
                <a
                  href={formatInstagramLink(data.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {data.instagram}
                </a>
              ) : (
                "-"
              )}
            </span>

            <span className="font-medium flex items-center gap-2">
              <Phone size={14} className="text-gray-400" /> Телефон
            </span>
            <span>{data.phone}</span>

            <span className="font-medium flex items-center gap-2">
              <BadgeCheck size={14} className="text-gray-400" /> Тип
            </span>
            <span>
              <Badge className={getTicketTypeClasses(data.grade)}>
                {data.grade}
              </Badge>
            </span>

            <span className="font-medium flex items-center gap-2">
              <CalendarClock size={14} className="text-gray-400" /> Дата
            </span>
            <span>{new Date(data.date).toLocaleString("uk-UA")}</span>

            <span className="font-medium flex items-center gap-2">
              <ArrowBigDownDashIcon size={14} className="text-gray-400" />
              Прибув(ла)
            </span>
            <span>{data.arrived ? "✅" : "❌"}</span>
          </div>
        )}
      </CardContent>

      {data && (
        <CardFooter className="pt-0">
          <Button
            variant={data.arrived ? "secondary" : "default"}
            disabled={isPending}
            onClick={() => mutate(!data.arrived)}
            className="ml-auto"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" />
                Оновлення...
              </span>
            ) : data.arrived ? (
              "Скасувати прибуття"
            ) : (
              "Позначити як прибув(ла)"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
