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

      <CardContent className="flex flex-col gap-6">
        <div>
          {isError && (
            <p className="text-destructive font-medium">
              Помилка завантаження учасників: {error?.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <Input
              placeholder="Пошук: імʼя, email, insta, телефон, коментар"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs flex-grow border-0 bg-background shadow-none"
            />

            <ToggleGroup
              type="single"
              variant="outline"
              value={photosSentFilter}
              onValueChange={(v) =>
                setPhotosSentFilter((v as typeof photosSentFilter) || "all")
              }
              aria-label="Фільтр по статусу відправки фото"
              className="gap-1 bg-background"
            >
              <ToggleGroupItem value="all" className="h-8 px-3">Всі</ToggleGroupItem>
              <ToggleGroupItem
                className="h-8 px-2"
                value="yes"
                aria-label="Фото надіслано"
              >
                <Camera size={16} className="text-success" />
              </ToggleGroupItem>
              <ToggleGroupItem
                className="h-8 px-2"
                value="no"
                aria-label="Фото не надіслано"
              >
                <CameraOff size={16} className="text-destructive" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isLoading && <Skeleton className="h-[400px] w-full rounded-md mt-6" />}
          {!filteredBattleTickets.length && !isError && !isLoading && (
            <p className="text-muted-foreground mt-4">Учасників не знайдено.</p>
          )}
        </div>

        {filteredBattleTickets.length > 0 && (
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Ім&apos;я</TableHead>
                  <TableHead className="text-center">Номінації</TableHead>
                  <TableHead className="text-center">Фото</TableHead>
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
                          className="text-success inline-block"
                        />
                      ) : (
                        <CameraOff
                          size={18}
                          className="text-destructive inline-block"
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
