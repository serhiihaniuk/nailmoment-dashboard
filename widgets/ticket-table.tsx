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
import { Ticket, PaymentInstallment } from "@/shared/db/schema";
import { cn, formatInstagramLink } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketTypeBadge } from "@/blocks/ticket-type-badge";
import { Check, Instagram, Loader, Mail, Phone, X } from "lucide-react";
import { AddTicketDialog } from "./add-ticket-dialog";
import { Label } from "@radix-ui/react-label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckedState } from "@radix-ui/react-checkbox";

interface TicketWithPayments extends Ticket {
  paymentInstallments: PaymentInstallment[];
}

async function fetchTickets(): Promise<TicketWithPayments[]> {
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
  } = useQuery<TicketWithPayments[], Error>({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    staleTime: Infinity,
  });

  const [arrived, setArrived] = useState<"all" | "yes" | "no">("all");
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState<CheckedState>(false);

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    if (!tickets) return [];
    return tickets
      .filter((t) => (showDeleted ? true : !t.archived)) // hide archived unless toggled
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
  }, [tickets, arrived, query, showDeleted]);

  const maxPayments = useMemo(
    () =>
      filtered.reduce((m, t) => Math.max(m, t.paymentInstallments.length), 0),
    [filtered]
  );

  const totals = useMemo(() => {
    let total = 0,
      paid = 0;
    filtered.forEach((t) =>
      t.paymentInstallments.forEach((p) => {
        total += +p.amount;
        if (p.is_paid) paid += +p.amount;
      })
    );
    return { total, paid };
  }, [filtered]);

  const totalRowColspan = 9 + maxPayments * 4 - 2; // cells before the 2 “grand-total” columns

  const amountFmt = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

        {/* ---------- controls ---------- */}
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
            Показати видалені
            <Checkbox
              checked={showDeleted}
              onCheckedChange={setShowDeleted}
              id="chkDeleted"
            />
          </Label>
        </div>

        {/* ---------- table ---------- */}
        {isLoading && <Skeleton className="max-h-96 w-full rounded-md" />}
        {!filtered.length && !isError && !isLoading && (
          <p className="px-4 rounded-md">Квитків не знайдено.</p>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto mx-2 rounded-md border border-gray-200 dark:border-gray-700">
            <Table>
              {/* -------- header -------- */}
              <TableHeader className="bg-muted/70 dark:bg-muted/20">
                <TableRow>
                  <TableHead>#</TableHead>
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
                  {Array.from({ length: maxPayments }).map((_, idx) => (
                    <React.Fragment key={idx}>
                      <TableHead className="text-center bg-muted border-dashed border-l border-border dark:bg-gray-800/40">
                        Сума {idx + 1}
                      </TableHead>
                      <TableHead className="text-center bg-muted dark:bg-gray-800/40">
                        Оплачено {idx + 1}
                      </TableHead>
                      <TableHead className="text-center bg-muted dark:bg-gray-800/40">
                        Фактура (запит) {idx + 1}
                      </TableHead>
                      <TableHead className="text-center bg-muted dark:bg-gray-800/40 border-dashed border-r border-border">
                        Фактура (відпр.) {idx + 1}
                      </TableHead>
                    </React.Fragment>
                  ))}
                  <TableHead className="text-center">Разом</TableHead>
                  <TableHead className="text-center">Разом сплачено</TableHead>
                </TableRow>
              </TableHeader>

              {/* -------- body -------- */}
              <TableBody>
                {filtered.map((t, i) => {
                  const totalPaid = t.paymentInstallments.reduce(
                    (s, p) => (p.is_paid ? s + Number(p.amount) : s),
                    0
                  );
                  const total = t.paymentInstallments.reduce(
                    (s, p) => s + Number(p.amount),
                    0
                  );

                  return (
                    <TableRow
                      key={t.id}
                      className={cn(
                        i % 2 === 0 && "bg-muted/25",
                        t.archived && "bg-destructive/10"
                      )}
                    >
                      <TableCell>{i + 1}</TableCell>
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
                          <TableLink
                            href={`tel:${t.phone.replace(/\s+/g, "")}`}
                          >
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

                      {/* payment cells */}
                      {Array.from({ length: maxPayments }).map((_, idx) => {
                        const p = t.paymentInstallments[idx];
                        return (
                          <React.Fragment key={idx}>
                            <TableCell className="border-l border-dashed border-border text-center bg-muted/20">
                              {p ? (
                                <Badge
                                  variant="outline"
                                  className="font-medium"
                                >
                                  {`${amountFmt.format(Number(p.amount))} zł`}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-center bg-muted/20">
                              {p ? (
                                p.is_paid ? (
                                  <Check
                                    size={16}
                                    className="text-green-600 mx-auto"
                                  />
                                ) : (
                                  <X
                                    size={16}
                                    className="text-orange-600 mx-auto"
                                  />
                                )
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-center bg-muted/20">
                              {p ? (
                                p.invoice_requested ? (
                                  <Check
                                    size={16}
                                    className="text-green-600 mx-auto"
                                  />
                                ) : (
                                  "-"
                                )
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-center border-dashed border-r border-border bg-muted/20">
                              {p?.invoice_requested ? (
                                p.invoice_sent ? (
                                  <Check
                                    size={16}
                                    className="text-green-600 mx-auto"
                                  />
                                ) : (
                                  <X
                                    size={16}
                                    className="text-orange-600 mx-auto"
                                  />
                                )
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}

                      <TableCell className="text-center font-semibold">
                        <Badge variant="outline">
                          {amountFmt.format(total)} zł
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        <Badge variant="secondary">
                          {amountFmt.format(totalPaid)} zł
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* totals row */}
                <TableRow className="bg-muted font-semibold">
                  <TableCell colSpan={2}>
                    {isFetching && (
                      <Loader
                        size={16}
                        className="animate-spin text-gray-500"
                      />
                    )}
                  </TableCell>
                  <TableCell colSpan={totalRowColspan} className="text-right">
                    Разом
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {amountFmt.format(totals.total)} zł
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {amountFmt.format(totals.paid)} zł
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* tiny link-button used inside cells */
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
