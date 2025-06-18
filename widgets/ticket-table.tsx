"use client";

import React, { FC, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket } from "@/shared/db/schema";
import { TICKET_TYPE_LIST } from "@/shared/const";
import { cn, formatInstagramLink } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import { Check, Instagram, Loader, Mail, Phone, X } from "lucide-react";
import { AddTicketDialog } from "./add-ticket-dialog";
import { Label } from "@radix-ui/react-label";
import { Button } from "@/components/ui/button";
import { CheckedState } from "@radix-ui/react-checkbox";

async function fetchTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/ticket");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function TicketsTable() {
  const {
    data: tickets,
    isLoading,
    isFetching,
    isError,
  } = useQuery<Ticket[], Error>({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    staleTime: Infinity,
  });

  const [arrived, setArrived] = useState<"all" | "yes" | "no">("all");
  const [grade, setGrade] = useState<"all" | (typeof TICKET_TYPE_LIST)[number]>(
    "all"
  );
  const [buyType, setBuyType] = useState<"all" | "stripe" | "manual">("all");
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState<CheckedState>(false);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    return tickets
      .filter((t) => (showDeleted ? true : !t.archived))
      .filter((t) =>
        arrived === "all" ? true : arrived === "yes" ? t.arrived : !t.arrived
      )
      .filter((t) =>
        grade === "all" ? true : (t.updated_grade ?? t.grade) === grade
      )
      .filter((t) =>
        buyType === "all"
          ? true
          : buyType === "manual"
            ? t.stripe_event_id.startsWith("manual")
            : !t.stripe_event_id.startsWith("manual")
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
  }, [tickets, arrived, grade, buyType, query, showDeleted]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Квитки
          <AddTicketDialog />
        </CardTitle>
      </CardHeader>

      <CardContent className="px-0 min-h-20">
        {isError && (
          <p className="p-4 text-red-600">Помилка завантаження квитків</p>
        )}

        <div className="flex flex-wrap gap-4 mb-4 px-4">
          <Input
            placeholder="Пошук: ім'я, email, insta, телефон"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs text-[16px] flex-grow"
          />

          <Label className="flex gap-2 items-center text-sm">
            Прибув(ла)
            <ToggleGroup
              type="single"
              variant="outline"
              value={arrived}
              onValueChange={(v) => setArrived((v as typeof arrived) || "all")}
            >
              <ToggleGroupItem value="all">Всі</ToggleGroupItem>
              <ToggleGroupItem className="px-2" value="yes">
                <Check size={16} className="text-green-600" />
              </ToggleGroupItem>
              <ToggleGroupItem className="px-2" value="no">
                <X size={14} className="text-red-600" />
              </ToggleGroupItem>
            </ToggleGroup>
          </Label>

          <Label className="flex gap-2 items-center text-sm">
            Тип
            <Select
              value={grade}
              onValueChange={(v) => setGrade((v as typeof grade) || "all")}
            >
              <SelectTrigger className="h-8 w-32 px-2">
                <SelectValue placeholder="Всі" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі</SelectItem>
                {TICKET_TYPE_LIST.map((t) => (
                  <SelectItem key={t} value={t}>
                    <TicketTypeBadge type={t} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>

          <Label className="flex gap-2 items-center text-sm">
            Оплата
            <Select
              value={buyType}
              onValueChange={(v) => setBuyType((v as typeof buyType) || "all")}
            >
              <SelectTrigger className="h-8 w-28 px-2">
                <SelectValue placeholder="Всі" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="manual">Direct</SelectItem>
              </SelectContent>
            </Select>
          </Label>

          <Label className="flex gap-2 items-center text-sm">
            Показати видалені
            <Checkbox
              checked={showDeleted}
              onCheckedChange={setShowDeleted}
              id="chkDeleted"
            />
          </Label>
        </div>

        {isLoading && <Skeleton className="h-[2000px] mx-2 rounded-md" />}
        {!filtered.length && !isError && !isLoading && (
          <p className="px-4 rounded-md">Квитків не знайдено.</p>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto mx-2 rounded-md border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader className="bg-muted/70 dark:bg-muted/20">
                <TableRow>
                  <TableHead className="sticky left-0 bg-muted">#</TableHead>
                  <TableHead>Ім&apos;я</TableHead>
                  <TableHead className="border-r border-dashed border-border text-center">
                    Прибув(ла)
                  </TableHead>
                  <TableHead className="text-center">Тип</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead>
                    <div className="flex gap-1 items-center">
                      <Mail
                        size={14}
                        className="text-muted-foreground mt-[2px]"
                      />
                      E-mail
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex gap-1 items-center">
                      <Instagram size={14} className="text-muted-foreground" />
                      Instagram
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex gap-1 items-center">
                      <Phone size={14} className="text-muted-foreground" />
                      Телефон
                    </div>
                  </TableHead>
                  <TableHead>Дата покупки</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((t, i) => (
                  <TableRow
                    key={t.id}
                    className={cn(
                      i % 2 === 0 && "bg-muted/25",
                      t.archived && "bg-destructive/5"
                    )}
                  >
                    <TableCell
                      className={cn(
                        "sticky left-0 bg-white z-10 border-r border-dashed border-border",
                        i % 2 === 0 && "bg-gray-50",
                        t.archived && "bg-red-300"
                      )}
                    >
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <TableLink href={`/ticket/${t.id}`}>{t.name}</TableLink>
                    </TableCell>
                    <TableCell className="text-center border-r border-dashed border-border">
                      {t.arrived ? (
                        <Check size={16} className="text-green-600 mx-auto" />
                      ) : (
                        <X size={16} className="text-red-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell>
                      <TicketTypeBadge type={t.updated_grade ?? t.grade} />
                    </TableCell>
                    <TableCell className="text-center">
                      {!t.stripe_event_id.startsWith("manual") && (
                        <Check
                          size={18}
                          className="text-emerald-900 inline-block"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {t.email ? (
                        <TableLink href={`mailto:${t.email}`}>
                          {t.email}
                        </TableLink>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {t.instagram ? (
                        <TableLink
                          target="_blank"
                          href={formatInstagramLink(t.instagram)}
                        >
                          {t.instagram}
                        </TableLink>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {t.phone ? (
                        <TableLink href={`tel:${t.phone.replace(/\s+/g, "")}`}>
                          {t.phone.replace(/\s+/g, "")}
                        </TableLink>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat("uk-UA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }).format(new Date(t.date))}
                    </TableCell>
                  </TableRow>
                ))}
                {isFetching && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      <Loader
                        size={16}
                        className="animate-spin text-gray-500 inline-block"
                      />{" "}
                      Оновлення…
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const TableLink: FC<{
  href: string;
  children: React.ReactNode;
  target?: string;
}> = ({ href, children, target }) => (
  <Button asChild size="sm" className="p-0" variant="link">
    <Link prefetch={false} target={target} href={href}>
      {children}
    </Link>
  </Button>
);
