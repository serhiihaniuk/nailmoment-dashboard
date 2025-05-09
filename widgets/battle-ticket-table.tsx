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
import { BattleTicket } from "@/shared/db/schema"; // Make sure BattleTicket is exported from your schema.ts
import { formatInstagramLink } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchBattleTickets(): Promise<BattleTicket[]> {
  const res = await fetch("/api/battle-ticket"); // Changed API endpoint
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
    queryKey: ["battleTickets"], // Changed query key
    queryFn: fetchBattleTickets,
    staleTime: 1500, // 1.5 seconds
  });

  const [mailSentFilter, setMailSentFilter] = useState<"all" | "yes" | "no">(
    "all"
  );
  const [query, setQuery] = useState("");

  const filteredBattleTickets = useMemo(() => {
    if (!battleTickets) return [];
    return battleTickets
      .filter((bt) =>
        mailSentFilter === "all"
          ? true
          : mailSentFilter === "yes"
            ? bt.mail_sent
            : !bt.mail_sent
      )
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
  }, [battleTickets, mailSentFilter, query]);

  if (isError) {
    console.error("Error in BattleTicketsTable query:", error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Учасники Батлу</CardTitle> {/* Changed title */}
      </CardHeader>

      <CardContent className="px-0 min-h-20">
        <div>
          {isError && (
            <p className="px-4 text-red-500">
              Помилка завантаження учасників: {error?.message}
            </p>
          )}

          <div className="flex flex-wrap gap-4 mb-4 px-4">
            <Input
              placeholder="Пошук: імʼя, email, insta, телефон, коментар"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs text-[16px] flex-grow"
            />

            <ToggleGroup
              type="single"
              variant="outline"
              value={mailSentFilter}
              onValueChange={(v) =>
                setMailSentFilter((v as typeof mailSentFilter) || "all")
              }
              aria-label="Фільтр по статусу відправки email"
            >
              <ToggleGroupItem value="all">Всі Email</ToggleGroupItem>
              <ToggleGroupItem
                className="px-2"
                value="yes"
                aria-label="Email надіслано"
              >
                Надіслано ✅
              </ToggleGroupItem>
              <ToggleGroupItem
                className="px-2"
                value="no"
                aria-label="Email не надіслано"
              >
                Не Надіслано ❌
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isLoading && <Skeleton className="h-36 w-full" />}
          {!filteredBattleTickets.length && !isError && !isLoading && (
            <p className="px-4">Учасників не знайдено.</p>
          )}
        </div>

        {filteredBattleTickets.length > 0 && (
          <div className="overflow-x-auto mx-2 rounded-md border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader className="bg-muted dark:bg-muted/50">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Ім&apos;я</TableHead>
                  <TableHead>Номінації</TableHead>
                  <TableHead>Email Надіслано</TableHead>
                  <TableHead>Електронна пошта</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Дата Реєстрації</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBattleTickets.map((bt, i) => (
                  <TableRow key={bt.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Link
                        href={`/battle/${bt.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {bt.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      {bt.nomination_quantity}
                    </TableCell>
                    <TableCell className="text-center">
                      {bt.mail_sent ? "✅" : "❌"}
                    </TableCell>
                    <TableCell>
                      {bt.email ? (
                        <Link
                          href={`mailto:${bt.email}`}
                          className="text-blue-500 hover:underline dark:text-blue-400"
                        >
                          {bt.email}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {bt.instagram ? (
                        <a
                          href={formatInstagramLink(bt.instagram)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {bt.instagram}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {bt.phone ? (
                        <Link
                          href={`tel:${bt.phone.replace(/\s+/g, "")}`}
                          className="text-blue-500 hover:underline dark:text-blue-400"
                        >
                          {bt.phone.replace(/\s+/g, "")}
                        </Link>
                      ) : (
                        "-"
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
