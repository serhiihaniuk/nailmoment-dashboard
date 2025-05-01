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
  ArrowRight,
  Text,
  FileText,
} from "lucide-react";
import { UpdateTicketInput } from "@/shared/db/schema.zod";
import { EditTicketDialog } from "@/blocks/edit-ticket-dialog";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import Link from "next/link";

async function fetchTicket(id: string): Promise<Ticket | null> {
  const r = await fetch(`/api/ticket/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function patchTicket(
  id: string,
  patch: UpdateTicketInput,
): Promise<Ticket> {
  const r = await fetch(`/api/ticket/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function patchArrived(id: string, arrived: boolean): Promise<Ticket> {
  return patchTicket(id, { arrived });
}

export function TicketCard({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<Ticket | null, Error>({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const arrivedMutation = useMutation({
    mutationFn: (arrived: boolean) => patchArrived(ticketId, arrived),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  const editMutation = useMutation({
    mutationFn: (patch: UpdateTicketInput) => patchTicket(ticketId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });

  return (
    <Card className="max-w-md mx-auto shadow-md">
      <CardHeader
        className={cn("py-6 transition-colors duration-300", {
          "bg-teal-100": data?.arrived,
          "bg-gray-300": !data?.arrived,
        })}
      >
        <CardTitle className="text-lg flex items-center gap-2">
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
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <span className="font-medium flex items-center gap-2">
              <User size={14} className="text-gray-400" /> Імʼя
            </span>
            <span>{data.name}</span>

            <span className="font-medium flex items-center gap-2">
              <Mail size={14} className="text-gray-400" />
              Електронна пошта
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
            <span className="flex items-center gap-2">
              <TicketTypeBadge type={data.grade} />
              {data.updated_grade && data.updated_grade && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <TicketTypeBadge type={data.updated_grade} />
                </>
              )}
            </span>

            <span className="font-medium flex items-center gap-2">
              <CalendarClock size={14} className="text-gray-400" />
              Дата покупки
            </span>
            <span>{new Date(data.date).toLocaleString("uk-UA")}</span>

            <span className="font-medium flex items-center gap-2">
              <ArrowBigDownDashIcon size={14} className="text-gray-400" />
              Прибув(ла)
            </span>
            <span>{data.arrived ? "✅" : "❌"}</span>

            <span className="font-medium flex items-center gap-2">
              <Text size={14} className="text-gray-400" />
              Коментар
            </span>
            <span>{data.comment || "-"}</span>
            <Link
              href={`/pdf/${data.id}`}
              className="text-blue-600 hover:underline"
            >
              <span className="font-medium flex items-center gap-2">
                <FileText size={14} className="text-gray-400" /> Квиток
              </span>
            </Link>
          </div>
        )}
      </CardContent>

      {data && (
        <CardFooter className="pt-0 flex gap-2">
          <EditTicketDialog ticket={data} mutation={editMutation} />

          <Button
            variant={data.arrived ? "secondary" : "default"}
            disabled={arrivedMutation.isPending}
            onClick={() => arrivedMutation.mutate(!data.arrived)}
            className="ml-auto"
          >
            {arrivedMutation.isPending ? (
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
