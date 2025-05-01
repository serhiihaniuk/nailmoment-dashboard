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
import { Ticket } from "@/shared/db/schema";
import { formatInstagramLink } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";

async function fetchTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/ticket");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function TicketsTable() {
  const {
    data: tickets,
    isLoading,
    isError,
  } = useQuery<Ticket[], Error>({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

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

      <CardContent className="px-0 min-h-20">
        <div>
          {isError && <p className="px-4">Помилка завантаження квитків</p>}

          <div className="flex gap-4 mb-4 px-4">
            <Input
              placeholder="Пошук: імʼя, email, insta, телефон"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs text-[16px]"
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
          </div>

          {isLoading && <Skeleton className="h-36 w-full" />}
          {!filtered.length && !isError && !isLoading && (
            <p>Квитків не знайдено.</p>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="overflow-x-auto mx-2 rounded-md border border-gray-200">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Ім&apos;я</TableHead>
                  <TableHead>Прибув(ла)</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Електронна пошта</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Дата покупки</TableHead>
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
                      <TicketTypeBadge type={t.updated_grade ?? t.grade} />
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
          </div>
        )}
      </CardContent>

      {/* ---------- filters at the bottom ---------- */}
    </Card>
  );
}
