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
import { cn, formatInstagramLink, linkStyles } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import { Check, Instagram, Loader, Mail, Phone, X } from "lucide-react";
import { AddTicketDialog } from "@/features/add-ticket";
import { Label } from "@radix-ui/react-label";

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
    "all",
  );
  const [buyType, setBuyType] = useState<"all" | "stripe" | "manual">("all");
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState<CheckedState>(false);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    return tickets
      .filter((t) => (showDeleted ? true : !t.archived))
      .filter((t) =>
        arrived === "all" ? true : arrived === "yes" ? t.arrived : !t.arrived,
      )
      .filter((t) =>
        grade === "all" ? true : (t.updated_grade ?? t.grade) === grade,
      )
      .filter((t) =>
        buyType === "all"
          ? true
          : buyType === "manual"
            ? t.stripe_event_id.startsWith("manual")
            : !t.stripe_event_id.startsWith("manual"),
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

      <CardContent className="flex flex-col gap-6">
        {isError && (
          <p className="text-destructive font-medium">Помилка завантаження квитків</p>
        )}

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
          <Input
            placeholder="Пошук: ім'я, email, insta, телефон"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs flex-grow border-0 bg-background shadow-none"
          />

          <Label className="flex gap-2 items-center text-body-medium">
            Прибув(ла)
            <ToggleGroup
              type="single"
              variant="outline"
              value={arrived}
              onValueChange={(v) => setArrived((v as typeof arrived) || "all")}
              className="gap-1 bg-background"
            >
              <ToggleGroupItem value="all" className="h-8 px-3">Всі</ToggleGroupItem>
              <ToggleGroupItem className="h-8 px-2" value="yes">
                <Check size={16} className="text-success" />
              </ToggleGroupItem>
              <ToggleGroupItem className="h-8 px-2" value="no">
                <X size={14} className="text-destructive" />
              </ToggleGroupItem>
            </ToggleGroup>
          </Label>

          <Label className="flex gap-2 items-center text-body-medium">
            Тип
            <Select
              value={grade}
              onValueChange={(v) => setGrade((v as typeof grade) || "all")}
            >
              <SelectTrigger className="h-8 w-32 px-3 bg-background">
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

          <Label className="flex gap-2 items-center text-body-medium">
            Оплата
            <Select
              value={buyType}
              onValueChange={(v) => setBuyType((v as typeof buyType) || "all")}
            >
              <SelectTrigger className="h-8 w-28 px-3 bg-background">
                <SelectValue placeholder="Всі" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="manual">Direct</SelectItem>
              </SelectContent>
            </Select>
          </Label>

          <Label className="flex gap-2 items-center text-body-medium">
            Показати видалені
            <Checkbox
              checked={showDeleted}
              onCheckedChange={setShowDeleted}
              id="chkDeleted"
            />
          </Label>
        </div>

        {isLoading && <Skeleton className="h-[400px] w-full rounded-md" />}
        {!filtered.length && !isError && !isLoading && (
          <p className="text-muted-foreground">Квитків не знайдено.</p>
        )}

        {filtered.length > 0 && (
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Ім&apos;я</TableHead>
                  <TableHead className="text-center">
                    Прибув(ла)
                  </TableHead>
                  <TableHead className="text-center">Тип</TableHead>
                  <TableHead className="text-center">Stripe</TableHead>
                  <TableHead>
                    <div className="flex gap-2 items-center">
                      <Mail size={14} className="opacity-70" />
                      E-mail
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex gap-2 items-center">
                      <Instagram size={14} className="opacity-70" />
                      Instagram
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex gap-2 items-center">
                      <Phone size={14} className="opacity-70" />
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
                      t.archived && "bg-destructive/10 hover:bg-destructive/15",
                    )}
                  >
                    <TableCell className="text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <TableLink href={`/ticket/${t.id}`}>{t.name}</TableLink>
                    </TableCell>
                    <TableCell className="text-center">
                      {t.arrived ? (
                        <Check size={16} className="text-success mx-auto" />
                      ) : (
                        <X size={16} className="text-destructive mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <TicketTypeBadge type={t.updated_grade ?? t.grade} />
                    </TableCell>
                    <TableCell className="text-center">
                      {!t.stripe_event_id.startsWith("manual") && (
                        <Check size={18} className="text-success mx-auto" />
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
                        className="animate-spin text-muted-foreground inline-block"
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
  <Link
    prefetch={false}
    target={target}
    href={href}
    className={linkStyles}
  >
    {children}
  </Link>
);
