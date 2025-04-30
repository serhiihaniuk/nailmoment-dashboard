"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Ticket } from "@/shared/db/schema";
import { cn, formatInstagramLink } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/ticket");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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

export function TicketsTable() {
  const {
    data: tickets,
    isLoading,
    isError,
  } = useQuery<Ticket[], Error>({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  /** ---------- local client-side filters ---------- */
  const [arrived, setArrived] = useState<"all" | "yes" | "no">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!tickets) return [];
    return tickets
      .filter((t) =>
        arrived === "all" ? true : arrived === "yes" ? t.arrived : !t.arrived
      )
      .filter((t) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          t.name?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.phone?.toLowerCase().includes(q) ||
          t.instagram?.toLowerCase().includes(q)
        );
      });
  }, [tickets, arrived, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Квитки</CardTitle>
      </CardHeader>

      <CardContent className="overflow-x-auto min-h-20">
        {!filtered.length && !isError && !isLoading && (
          <p>Квитків не знайдено.</p>
        )}
        {isError && <p>Помилка завантаження квитків</p>}
        {isLoading && <Skeleton className="h-36 w-full" />}

        {filtered.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Ім&apos;я</TableHead>
                <TableHead>Прибув(ла)</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Електронна пошта</TableHead>
                <TableHead>Instagram</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/ticket/${t.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    {t.arrived ? "✅" : "❌"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getTicketTypeClasses(t.grade)}>
                      {t.grade}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>
                    {t.instagram ? (
                      <a
                        href={formatInstagramLink(t.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {t.instagram}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{t.phone}</TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat("uk-UA", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(t.date))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* ---------- filters at the bottom ---------- */}
      <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Input
          placeholder="Пошук: імʼя, email, insta, телефон"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs text-[18px]"
        />

        <ToggleGroup
          type="single"
          variant="outline"
          value={arrived}
          onValueChange={(v) => setArrived((v as typeof arrived) || "all")}
        >
          <ToggleGroupItem value="all">Всі</ToggleGroupItem>
          <ToggleGroupItem className="px-2" value="yes">
            ✅
          </ToggleGroupItem>
          <ToggleGroupItem className="px-2" value="no">
            ❌
          </ToggleGroupItem>
        </ToggleGroup>
      </CardFooter>
    </Card>
  );
}
