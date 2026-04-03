"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInstagramLink, linkStyles } from "@/shared/utils";
import {
  AlertTriangle,
  Ghost,
  Camera,
  CameraOff,
  MailCheck,
  MailX,
} from "lucide-react";
import { EditBattleTicketDialog } from "@/features/edit-battle-ticket";
import Link from "next/link";
import { BattleTicket } from "@/shared/db/schema";

async function fetchBattleTicket(id: string): Promise<BattleTicket | null> {
  const r = await fetch(`/api/battle-ticket/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function BattleTicketPanel({ battleTicketId }: { battleTicketId: string }) {
  const { data, isLoading, isError, error } = useQuery<BattleTicket | null, Error>({
    queryKey: ["battleTicket", battleTicketId],
    queryFn: () => fetchBattleTicket(battleTicketId),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full mt-4" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 pt-16 text-destructive">
        <AlertTriangle size={20} />
        <span className="text-sm font-medium">{error?.message || "Помилка завантаження"}</span>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex flex-col items-center gap-2 pt-16 text-muted-foreground">
        <Ghost size={20} />
        <span className="text-sm">Учасника не знайдено</span>
      </div>
    );
  }

  if (!data) return null;

  const bt = data;

  return (
    <div className="flex flex-col gap-0 animate-in-fade">
      {/* Header: Identity block */}
      <div className="pt-4 pb-4">
        <span className="text-muted-foreground text-[12px]">Учасник батлу</span>

        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground mt-1">
          {bt.name}
        </h2>

        <div className="flex items-center gap-2 mt-1.5 text-[12px] text-muted-foreground">
          <span className="font-mono">#{battleTicketId.slice(-6)}</span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1">
            {bt.photos_sent ? (
              <Camera size={12} className="text-[#1a7f37]" />
            ) : (
              <CameraOff size={12} className="text-destructive" />
            )}
            <span>{bt.photos_sent ? "Фото надіслано" : "Фото не надіслано"}</span>
          </span>
          <span className="text-border">·</span>
          <span>{bt.nomination_quantity} номінацій</span>
        </div>
      </div>

      {/* Section: Контакти */}
      <div className="border-t border-border/60 py-5">
        <h3 className="text-label-caps mb-3">Контакти</h3>
        <div className="flex flex-col gap-2.5">
          <PanelRow label="E-mail" value={
            bt.email ? (
              <Link href={`mailto:${bt.email}`} className={linkStyles}>{bt.email}</Link>
            ) : "—"
          } />
          <PanelRow label="Телефон" value={
            bt.phone ? (
              <Link href={`tel:${bt.phone.replace(/\s+/g, "")}`} className={linkStyles}>
                {bt.phone.replace(/\s+/g, "")}
              </Link>
            ) : "—"
          } />
          <PanelRow label="Instagram" value={
            bt.instagram ? (
              <a href={formatInstagramLink(bt.instagram)} target="_blank" rel="noopener noreferrer" className={linkStyles}>
                @{bt.instagram}
              </a>
            ) : "—"
          } />
        </div>
      </div>

      {/* Section: Деталі */}
      <div className="border-t border-border/60 py-5">
        <h3 className="text-label-caps mb-3">Деталі</h3>
        <div className="flex flex-col gap-2.5">
          <PanelRow
            label="Номінації"
            value={bt.nomination_quantity.toString()}
          />
          <PanelRow
            label="Дата реєстрації"
            value={new Date(bt.date).toLocaleDateString("uk-UA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <PanelRow
            label="Тип оплати"
            value={bt.payment_type}
          />
          <PanelRow label="Коментар" value={bt.comment || "—"} />
        </div>
      </div>

      {/* Section: Статуси */}
      <div className="border-t border-border/60 py-5">
        <h3 className="text-label-caps mb-3">Статуси</h3>
        <div className="flex flex-col gap-2.5">
          <PanelRow label="Email надіслано" value={
            <span className="flex items-center gap-1.5">
              {bt.mail_sent ? (
                <MailCheck size={14} className="text-[#1a7f37]" />
              ) : (
                <MailX size={14} className="text-warning" />
              )}
              {bt.mail_sent ? "Так" : "Ні"}
            </span>
          } />
          <PanelRow label="Фото надіслано" value={
            <span className="flex items-center gap-1.5">
              {bt.photos_sent ? (
                <Camera size={14} className="text-[#1a7f37]" />
              ) : (
                <CameraOff size={14} className="text-destructive" />
              )}
              {bt.photos_sent ? "Так" : "Ні"}
            </span>
          } />
        </div>
      </div>

      {/* Edit button */}
      <div className="border-t border-border/60 py-5">
        <EditBattleTicketDialog battleTicket={bt} battleTicketId={battleTicketId} />
      </div>
    </div>
  );
}

function PanelRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[12px] text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-[13px] text-foreground min-w-0 wrap-break-word">{value}</span>
    </div>
  );
}
