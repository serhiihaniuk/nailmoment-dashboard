"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Квитки</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto min-h-20">
        {!tickets?.length && !isError && !isLoading && (
          <p>Квитків не знайдено.</p>
        )}
        {isError && <p>Помилка завантаження квитків</p>}
        {isLoading && <Skeleton className="h-36 w-full" />}
        {tickets?.length && (
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
              {tickets.map((t, i) => (
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
                    <span>{t.arrived ? "✅" : "❌"}</span>
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
                    {new Date(t.date).toLocaleString("uk-UA")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
