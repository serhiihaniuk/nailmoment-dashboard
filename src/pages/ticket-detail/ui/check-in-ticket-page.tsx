"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, Ghost, Loader2 } from "lucide-react";
import Link from "next/link";

import {
  formatInstagramLink,
  parseCheckInTicket,
  type CheckInTicket,
} from "@/entities/ticket";
import { TicketTypeBadge } from "@/entities/ticket/index.client";
import { cn } from "@/shared/lib/cn";
import { linkStyles } from "@/shared/lib/link-styles";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

async function fetchCheckInTicket(id: string): Promise<CheckInTicket | null> {
  const response = await fetch(`/api/check-in/ticket/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await response.text());
  return parseCheckInTicket(await response.json());
}

async function patchTicketArrival({
  arrived,
  ticketId,
}: {
  arrived: boolean;
  ticketId: string;
}): Promise<CheckInTicket> {
  const response = await fetch(`/api/check-in/ticket/${ticketId}/arrival`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ arrived }),
  });

  if (!response.ok) throw new Error(await response.text());
  return parseCheckInTicket(await response.json());
}

export function CheckInTicketPage({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const {
    data: ticket,
    error,
    isError,
    isLoading,
  } = useQuery<CheckInTicket | null, Error>({
    queryKey: ["check-in-ticket", ticketId],
    queryFn: () => fetchCheckInTicket(ticketId),
  });

  const arrivalMutation = useMutation({
    mutationFn: patchTicketArrival,
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(["check-in-ticket", ticketId], updatedTicket);
      queryClient.invalidateQueries({ queryKey: ["check-in-tickets"] });
    },
  });

  return (
    <div className="page-container max-w-lg py-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Квитки
      </Link>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-surface">
        <div className="px-6 py-6">
          {isLoading && (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-18 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-2 py-16 text-destructive">
              <AlertTriangle size={20} />
              <span className="text-sm font-medium">
                {error?.message || "Помилка завантаження"}
              </span>
            </div>
          )}

          {ticket === null && (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Ghost size={20} />
              <span className="text-sm">Квиток не знайдено</span>
            </div>
          )}

          {ticket && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[22px] font-semibold text-foreground">
                  {ticket.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="font-mono">#{ticket.id.slice(-6)}</span>
                  <span className="text-border">·</span>
                  <TicketTypeBadge type={ticket.updated_grade ?? ticket.grade} />
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg px-4 py-4",
                  ticket.arrived ? "bg-[#1a7f37]/15" : "bg-muted/50"
                )}
              >
                {ticket.arrived ? (
                  <span className="flex items-center gap-2.5 text-[20px] font-semibold text-[#1a7f37]">
                    <Check size={22} strokeWidth={2.5} />
                    Прибув(ла)
                  </span>
                ) : (
                  <span className="flex items-center gap-2.5 text-[18px] font-medium text-muted-foreground">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#cccccc]" />
                    Не прибув(ла)
                  </span>
                )}
              </div>

              <div className="border-t border-border/60 pt-5">
                <h3 className="text-label-caps mb-3">Контакти</h3>
                <div className="flex flex-col gap-2.5">
                  <DetailRow
                    label="E-mail"
                    value={
                      ticket.email ? (
                        <Link href={`mailto:${ticket.email}`} className={linkStyles}>
                          {ticket.email}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    label="Телефон"
                    value={
                      ticket.phone ? (
                        <Link
                          href={`tel:${ticket.phone.replace(/\s+/g, "")}`}
                          className={linkStyles}
                        >
                          {ticket.phone.replace(/\s+/g, "")}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow
                    label="Instagram"
                    value={
                      ticket.instagram ? (
                        <a
                          href={formatInstagramLink(ticket.instagram)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkStyles}
                        >
                          @{ticket.instagram}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {ticket && (
          <div className="border-t border-border/60 bg-white px-6 py-4">
            <Button
              type="button"
              disabled={arrivalMutation.isPending}
              onClick={() =>
                arrivalMutation.mutate({
                  arrived: !ticket.arrived,
                  ticketId: ticket.id,
                })
              }
              className="h-10 w-full gap-2"
              variant={ticket.arrived ? "outline" : "default"}
            >
              {arrivalMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {ticket.arrived ? "Скасувати прибуття" : "Позначити прибуття"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
