"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatInstagramLink, linkStyles } from "@/shared/utils";
import { Loader2, AlertTriangle, Ghost, ArrowRight, Check } from "lucide-react";
import { UpdateTicketInput } from "@/shared/db/schema.zod";
import { EditTicketDialog } from "@/features/edit-ticket";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import Link from "next/link";
import { TicketWithPayments } from "@/shared/db/service/ticket-service";
import { Badge } from "@/components/ui/badge";
import { SlidePanel } from "@/components/ui/slide-panel";

async function fetchTicket(id: string): Promise<TicketWithPayments | null> {
  const r = await fetch(`/api/ticket/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function patchArrived(
  id: string,
  arrived: boolean,
): Promise<TicketWithPayments> {
  const r = await fetch(`/api/ticket/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ arrived } satisfies UpdateTicketInput),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function TicketPanelWrapper({
  ticketId,
  onClose,
}: {
  ticketId: string | null;
  onClose: () => void;
}) {
  return (
    <SlidePanel open={!!ticketId} onClose={onClose}>
      {ticketId && (
        <div className="flex flex-col">
          <TicketPanelContent ticketId={ticketId} />
          <div className="border-t border-border/60 py-5">
            <ArrivalFooter ticketId={ticketId} />
          </div>
        </div>
      )}
    </SlidePanel>
  );
}

/* ── Sticky bottom action ── */

export function ArrivalFooter({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const { data, isFetching } = useQuery<TicketWithPayments | null, Error>({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const arrivedMutation = useMutation({
    mutationFn: (arrived: boolean) => patchArrived(ticketId, arrived),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  if (!data || data.archived) return null;

  const isPending = arrivedMutation.isPending || isFetching;

  if (data.arrived) {
    // Arrived — quiet undo link
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => arrivedMutation.mutate(false)}
          disabled={isPending}
          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          Скасувати прибуття
        </button>
      </div>
    );
  }

  // Not arrived — outline button
  return (
    <button
      type="button"
      onClick={() => arrivedMutation.mutate(true)}
      disabled={isPending}
      className="w-full h-10 flex items-center justify-center gap-2 border border-border rounded-lg text-[13px] text-foreground font-medium bg-white hover:bg-muted/40 transition-colors disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
      ) : (
        "Позначити прибуття"
      )}
    </button>
  );
}

export function TicketPanelContent({ ticketId }: { ticketId: string }) {
  const { data, isLoading, isError, error } = useQuery<
    TicketWithPayments | null,
    Error
  >({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full mt-3" />
        <Skeleton className="h-32 w-full mt-2" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 pt-16 text-destructive">
        <AlertTriangle size={20} />
        <span className="text-sm font-medium">
          {error?.message || "Помилка завантаження"}
        </span>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex flex-col items-center gap-2 pt-16 text-muted-foreground">
        <Ghost size={20} />
        <span className="text-sm">Квиток не знайдено</span>
      </div>
    );
  }

  if (!data) return null;

  const ticket = data;

  return (
    <div className="flex flex-col gap-0 animate-in-fade">
      {/* Identity */}
      <div className="pt-4 pb-4">
        {ticket.archived && (
          <Badge
            variant="destructive"
            className="text-[10px] px-1.5 py-0 mb-2 inline-flex"
          >
            DELETED
          </Badge>
        )}
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
          {ticket.name}
        </h2>
        <div className="flex items-center gap-2 mt-1.5 text-[12px] text-muted-foreground flex-wrap">
          <span className="font-mono">#{ticketId.slice(-6)}</span>
          <span className="text-border">·</span>
          <TicketTypeBadge type={ticket.grade} />
          {ticket.updated_grade && (
            <>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <TicketTypeBadge type={ticket.updated_grade} />
            </>
          )}
        </div>
      </div>

      {/* Status strip — the hero element */}
      {!ticket.archived && (
        <div
          className={cn(
            "rounded-lg px-4 py-4 mb-4",
            ticket.arrived ? "bg-[#1a7f37]/15" : "bg-muted/50",
          )}
        >
          {ticket.arrived ? (
            <span className="flex items-center gap-2.5 text-[20px] font-semibold text-[#1a7f37]">
              <Check size={22} strokeWidth={2.5} />
              Прибув(ла)
            </span>
          ) : (
            <span className="flex items-center gap-2.5 text-[18px] font-medium text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-[#cccccc] shrink-0" />
              Не прибув(ла)
            </span>
          )}
        </div>
      )}

      {/* Контакти */}
      <div className="border-t border-border/60 py-5">
        <h3 className="text-label-caps mb-3">Контакти</h3>
        <div className="flex flex-col gap-2.5">
          <PanelRow
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
          <PanelRow
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
          <PanelRow
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

      {/* Деталі */}
      <div className="border-t border-border/60 py-5">
        <h3 className="text-label-caps mb-3">Деталі</h3>
        <div className="flex flex-col gap-2.5">
          <PanelRow
            label="Дата покупки"
            value={new Date(ticket.date).toLocaleDateString("uk-UA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <PanelRow label="Коментар" value={ticket.comment || "—"} />
          <PanelRow
            label="QR квиток"
            value={
              <Link
                href={`/pdf/${ticket.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={linkStyles}
              >
                Переглянути / Завантажити
              </Link>
            }
          />
        </div>

        <div className="mt-4">
          <EditTicketDialog
            ticket={ticket}
            ticketId={ticketId}
            trigger={
              <button
                type="button"
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Редагувати
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}

function PanelRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[12px] text-muted-foreground w-28 shrink-0">
        {label}
      </span>
      <span className="text-[13px] text-foreground min-w-0 break-words">
        {value}
      </span>
    </div>
  );
}
