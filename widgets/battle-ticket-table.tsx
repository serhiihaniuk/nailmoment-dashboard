"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BattleTicket } from "@/shared/db/schema";
import { formatInstagramLink, linkStyles } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, CameraOff } from "lucide-react";
import { AddBattleTicketDialog } from "@/features/add-battle-ticket";

async function fetchBattleTickets(): Promise<BattleTicket[]> {
  const res = await fetch("/api/battle-ticket");
  if (!res.ok) {
    const errorText = await res.text();
    console.error("Failed to fetch battle tickets:", errorText);
    throw new Error(`Failed to fetch battle tickets: ${res.statusText}`);
  }
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

  const filteredBattleTickets = useMemo(() => {
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

  if (isError) {
    console.error("Error in BattleTicketsTable query:", error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Учасники Батлу <AddBattleTicketDialog />
        </CardTitle>
      </CardHeader>

      <CardContent className="px-0 min-h-20">
        <div>
          {isError && (
            <p className="px-4 text-red-600">
              Помилка завантаження учасників: {error?.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-4 mx-4 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Input
              placeholder="Пошук: імʼя, email, insta, телефон, коментар"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs text-[16px] flex-grow border-0 bg-background shadow-none"
            />

            <ToggleGroup
              type="single"
              variant="outline"
              value={photosSentFilter}
              onValueChange={(v) =>
                setPhotosSentFilter((v as typeof photosSentFilter) || "all")
              }
              aria-label="Фільтр по статусу відправки фото"
            >
              <ToggleGroupItem value="all">Всі</ToggleGroupItem>
              <ToggleGroupItem
                className="px-2"
                value="yes"
                aria-label="Фото надіслано"
              >
                <Camera size={16} className="mr-1 text-emerald-600" />
              </ToggleGroupItem>
              <ToggleGroupItem
                className="px-2"
                value="no"
                aria-label="Фото не надіслано"
              >
                <CameraOff size={16} className="mr-1 text-red-600" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isLoading && <Skeleton className="h-36 w-full" />}
          {!filteredBattleTickets.length && !isError && !isLoading && (
            <p className="px-4">Учасників не знайдено.</p>
          )}
        </div>

        {filteredBattleTickets.length > 0 && (
          <div className="overflow-x-auto mx-4 rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>#</TableHead>
                  <TableHead>Ім&apos;я</TableHead>
                  <TableHead>Номінації</TableHead>
                  <TableHead>Фото</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBattleTickets.map((bt, i) => (
                  <TableRow key={bt.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Link
                        href={`/battle/${bt.id}`}
                        className={linkStyles}
                      >
                        {bt.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      {bt.nomination_quantity}
                    </TableCell>
                    <TableCell className="text-center">
                      {bt.photos_sent ? (
                        <Camera
                          size={18}
                          className="text-emerald-600 inline-block"
                        />
                      ) : (
                        <CameraOff
                          size={18}
                          className="text-red-600 inline-block"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {bt.email ? (
                        <Link
                          href={`mailto:${bt.email}`}
                          className={linkStyles}
                        >
                          {bt.email}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bt.instagram ? (
                        <a
                          href={formatInstagramLink(bt.instagram)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkStyles}
                        >
                          {bt.instagram}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bt.phone ? (
                        <Link
                          href={`tel:${bt.phone.replace(/\s+/g, "")}`}
                          className={linkStyles}
                        >
                          {bt.phone.replace(/\s+/g, "")}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
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
      </CardContent>
    </Card>
  );
}
