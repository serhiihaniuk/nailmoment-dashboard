"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { BattleTicket } from "@/shared/db/schema";
import { cn } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, CameraOff, Search } from "lucide-react";
import { AddBattleTicketDialog } from "@/features/add-battle-ticket";
import { SlidePanel } from "@/components/ui/slide-panel";
import { BattleTicketPanel } from "@/widgets/battle-ticket-panel";

async function fetchBattleTickets(): Promise<BattleTicket[]> {
  const res = await fetch("/api/battle-ticket");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function BattleTicketsTable() {
  const {
    data: battleTickets,
    isLoading,
    isError,
    error,
  } = useQuery<BattleTicket[], Error>({
    queryKey: ["battleTickets"],
    queryFn: fetchBattleTickets,
    staleTime: 1500,
  });

  const [photosSentFilter, setPhotosSentFilter] = useState<
    "all" | "yes" | "no"
  >("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Auto-open panel from URL query param (e.g., redirected from /battle/[id])
  // Run once on mount only — avoids reopening panel after user closes it
  useEffect(() => {
    const ticketParam = searchParams.get("ticket");
    if (ticketParam) setSelectedId(ticketParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClosePanel = useCallback(() => setSelectedId(null), []);
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const filtered = useMemo(() => {
    if (!battleTickets) return [];
    return battleTickets
      .filter((bt) => {
        if (photosSentFilter === "all") return true;
        return photosSentFilter === "yes" ? bt.photos_sent : !bt.photos_sent;
      })
      .filter((bt) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          bt.name?.toLowerCase().includes(q) ||
          bt.email?.toLowerCase().includes(q) ||
          bt.phone?.toLowerCase().includes(q) ||
          bt.instagram?.toLowerCase().includes(q) ||
          bt.comment?.toLowerCase().includes(q)
        );
      });
  }, [battleTickets, photosSentFilter, query]);

  // Stats
  const stats = useMemo(() => {
    if (!battleTickets) return null;
    return {
      total: battleTickets.length,
      photosSent: battleTickets.filter((bt) => bt.photos_sent).length,
      photosNotSent: battleTickets.filter((bt) => !bt.photos_sent).length,
    };
  }, [battleTickets]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading-1">
          Учасники Батлу{" "}
          {stats && (
            <span className="text-muted-foreground font-normal text-base">
              {stats.total}
            </span>
          )}
        </h2>
        <AddBattleTicketDialog />
      </div>

      {/* Stats row */}
      {stats && (
        <div className="text-[12px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span>{stats.total} всього</span>
          <span className="text-border">·</span>
          <span className="text-[#1a7f37]">
            {stats.photosSent} фото надіслано
          </span>
          <span className="text-border">·</span>
          <span>{stats.photosNotSent} очікують фото</span>
        </div>
      )}

      {isError && (
        <p className="text-destructive font-medium">
          Помилка завантаження учасників: {error?.message}
        </p>
      )}

      {isLoading && <Skeleton className="h-[400px] w-full rounded-xl" />}

      {!isLoading && (
        <div className="rounded-xl border border-border/60 bg-white shadow-surface overflow-hidden animate-in-fade">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 px-3 py-2 border-b border-border/40">
            {/* Search */}
            <div className="relative flex-grow sm:max-w-[220px]">
              <Search
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              />
              <Input
                placeholder="Пошук..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-7 h-8 border-0 bg-transparent shadow-none text-base md:text-[13px] placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />

            {/* Photo filter — segmented control */}
            <div className="flex items-center h-7 rounded-md bg-muted/50 p-0.5">
              <SegmentBtn
                active={photosSentFilter === "all"}
                onClick={() => setPhotosSentFilter("all")}
              >
                Всі
              </SegmentBtn>
              <SegmentBtn
                active={photosSentFilter === "yes"}
                onClick={() => setPhotosSentFilter("yes")}
              >
                <Camera size={12} className="text-[#1a7f37]" />
              </SegmentBtn>
              <SegmentBtn
                active={photosSentFilter === "no"}
                onClick={() => setPhotosSentFilter("no")}
              >
                <CameraOff size={12} className="text-destructive" />
              </SegmentBtn>
            </div>
          </div>

          {/* Empty state */}
          {!filtered.length && !isError && (
            <p className="text-muted-foreground text-center py-12">
              Учасників не знайдено.
            </p>
          )}

          {/* Desktop table */}
          {filtered.length > 0 && (
            <div className="hidden md:block [&_[data-slot=table-container]]:border-0 [&_[data-slot=table-container]]:rounded-none [&_[data-slot=table-container]]:bg-transparent">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Ім&apos;я / Статус</TableHead>
                    <TableHead className="text-center">Номінації</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((bt, i) => (
                    <TableRow
                      key={bt.id}
                      className={cn(
                        "cursor-pointer",
                        selectedId === bt.id && "bg-muted/60",
                      )}
                      onClick={() => handleSelect(bt.id)}
                    >
                      <TableCell className="text-muted-foreground/60 tabular-nums">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              bt.photos_sent
                                ? "bg-[#1a7f37]"
                                : "bg-destructive",
                            )}
                            title={
                              bt.photos_sent ? "Фото надіслано" : "Не надіслано"
                            }
                          />
                          <span className="font-medium">{bt.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {bt.nomination_quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {bt.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {bt.instagram || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {bt.phone ? bt.phone.replace(/\s+/g, "") : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {new Intl.DateTimeFormat("uk-UA", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(new Date(bt.date))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Mobile card list */}
          {filtered.length > 0 && (
            <div className="md:hidden flex flex-col">
              {filtered.map((bt) => (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => handleSelect(bt.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border/40 transition-colors hover:bg-muted/30 active:bg-muted/50",
                    selectedId === bt.id && "bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          bt.photos_sent ? "bg-[#1a7f37]" : "bg-destructive",
                        )}
                      />
                      <span className="text-[13px] font-medium truncate">
                        {bt.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {bt.photos_sent ? (
                        <Camera size={12} className="text-[#1a7f37]" />
                      ) : (
                        <CameraOff size={12} className="text-destructive" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {bt.nomination_quantity}N
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground">
                    {bt.email && <span className="truncate">{bt.email}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slide-out panel */}
      <SlidePanel open={!!selectedId} onClose={handleClosePanel}>
        {selectedId && <BattleTicketPanel battleTicketId={selectedId} />}
      </SlidePanel>
    </div>
  );
}

/* ── Local components ── */
function SegmentBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-6 px-2 rounded-[5px] text-[11px] font-medium transition-all duration-150 flex items-center justify-center",
        active
          ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
