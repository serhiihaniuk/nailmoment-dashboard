"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";

import {
  parseCheckInTicket,
  parseCheckInTicketList,
  TICKET_TYPE,
  type CheckInTicket,
} from "@/entities/ticket";
import { TicketTypeBadge } from "@/entities/ticket/index.client";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

async function fetchCheckInTickets(): Promise<CheckInTicket[]> {
  const response = await fetch("/api/check-in/ticket");
  if (!response.ok) throw new Error(await response.text());
  return parseCheckInTicketList(await response.json());
}

async function patchTicketArrival({
  arrived,
  ticketId,
}: {
  arrived: boolean;
  ticketId: string;
}): Promise<CheckInTicket> {
  const response = await fetch(`/api/check-in/ticket/${ticketId}/arrival`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ arrived }),
  });

  if (!response.ok) throw new Error(await response.text());
  return parseCheckInTicket(await response.json());
}

export function CheckInTicketsTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [arrivalFilter, setArrivalFilter] = useState<"all" | "yes" | "no">(
    "no"
  );
  const [query, setQuery] = useState("");

  const { data, isError, isLoading, isFetching } = useQuery<
    CheckInTicket[],
    Error
  >({
    queryKey: ["check-in-tickets"],
    queryFn: fetchCheckInTickets,
    staleTime: 15_000,
  });

  const arrivalMutation = useMutation({
    mutationFn: patchTicketArrival,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["check-in-tickets"] });
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return data
      .filter((ticket) =>
        arrivalFilter === "all"
          ? true
          : arrivalFilter === "yes"
            ? ticket.arrived
            : !ticket.arrived
      )
      .filter((ticket) => {
        if (!normalizedQuery) return true;
        return (
          ticket.id.toLowerCase().includes(normalizedQuery) ||
          ticket.name.toLowerCase().includes(normalizedQuery) ||
          ticket.email.toLowerCase().includes(normalizedQuery) ||
          ticket.phone.toLowerCase().includes(normalizedQuery) ||
          ticket.instagram.toLowerCase().includes(normalizedQuery)
        );
      });
  }, [arrivalFilter, data, query]);

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      total: data.length,
      arrived: data.filter((ticket) => ticket.arrived).length,
      remaining: data.filter((ticket) => !ticket.arrived).length,
      vip: data.filter((ticket) => getTicketGrade(ticket) === TICKET_TYPE.VIP)
        .length,
    };
  }, [data]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading-1">
          Квитки{" "}
          {stats && (
            <span className="text-base font-normal text-muted-foreground">
              {stats.total}
            </span>
          )}
        </h2>
      </div>

      {stats && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>{stats.remaining} не прибули</span>
          <span className="text-border">·</span>
          <span>{stats.arrived} прибули</span>
          {stats.vip > 0 && (
            <>
              <span className="text-border">·</span>
              <span>{stats.vip} VIP</span>
            </>
          )}
        </div>
      )}

      {isError && (
        <p className="font-medium text-destructive">Помилка завантаження квитків</p>
      )}

      {isLoading && <Skeleton className="h-100 w-full rounded-xl" />}

      {!isLoading && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border/60 bg-white shadow-surface md:block">
            <CheckInToolbar
              arrivalFilter={arrivalFilter}
              query={query}
              setArrivalFilter={setArrivalFilter}
              setQuery={setQuery}
            />

            {!filtered.length && !isError && (
              <p className="py-12 text-center text-muted-foreground">
                Квитків не знайдено.
              </p>
            )}

            {filtered.length > 0 && (
              <div className="**:data-[slot=table-container]:border-0 **:data-[slot=table-container]:rounded-none **:data-[slot=table-container]:bg-transparent">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Ім&apos;я</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Квиток</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/ticket/${ticket.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ArrivalDot arrived={ticket.arrived} />
                            <span className="inline-block max-w-48 truncate font-medium">
                              {ticket.name}
                            </span>
                            <TicketTypeBadge type={getTicketGrade(ticket)} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrivalButton
                            arrived={ticket.arrived}
                            isPending={
                              arrivalMutation.isPending &&
                              arrivalMutation.variables?.ticketId === ticket.id
                            }
                            onToggle={() =>
                              arrivalMutation.mutate({
                                arrived: !ticket.arrived,
                                ticketId: ticket.id,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ticket.email || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ticket.phone.replace(/\s+/g, "") || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-[12px] text-muted-foreground">
                          #{ticket.id.slice(-6)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {isFetching && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <Loader2
                            size={16}
                            className="inline-block animate-spin text-muted-foreground"
                          />{" "}
                          Оновлення…
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            <div className="sticky top-12 z-40 rounded-xl border border-border/60 bg-white shadow-surface">
              <CheckInToolbar
                arrivalFilter={arrivalFilter}
                query={query}
                setArrivalFilter={setArrivalFilter}
                setQuery={setQuery}
                stacked
              />
            </div>

            {!filtered.length && !isError && (
              <p className="py-12 text-center text-muted-foreground">
                Квитків не знайдено.
              </p>
            )}

            {filtered.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-surface">
                {filtered.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="border-b border-border/40 px-4 py-3 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/ticket/${ticket.id}`)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ArrivalDot arrived={ticket.arrived} />
                        <span className="truncate text-[13px] font-medium">
                          {ticket.name}
                        </span>
                      </span>
                      <TicketTypeBadge type={getTicketGrade(ticket)} />
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-3 pl-3.5">
                      <span className="truncate text-[12px] text-muted-foreground">
                        {ticket.email}
                      </span>
                      <ArrivalButton
                        arrived={ticket.arrived}
                        isPending={
                          arrivalMutation.isPending &&
                          arrivalMutation.variables?.ticketId === ticket.id
                        }
                        onToggle={() =>
                          arrivalMutation.mutate({
                            arrived: !ticket.arrived,
                            ticketId: ticket.id,
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CheckInToolbar({
  arrivalFilter,
  query,
  setArrivalFilter,
  setQuery,
  stacked = false,
}: {
  arrivalFilter: "all" | "yes" | "no";
  query: string;
  setArrivalFilter: (value: "all" | "yes" | "no") => void;
  setQuery: (value: string) => void;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 border-b border-border/40 px-3 py-2",
        stacked ? "flex-col" : "flex-wrap items-center"
      )}
    >
      <div className="relative grow">
        <Search
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
        <Input
          placeholder="Пошук..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-8 border-0 bg-transparent pl-7 text-base shadow-none placeholder:text-muted-foreground/40 md:text-[13px]"
        />
      </div>
      <ArrivalSegment value={arrivalFilter} onChange={setArrivalFilter} />
    </div>
  );
}

function ArrivalSegment({
  value,
  onChange,
}: {
  value: "all" | "yes" | "no";
  onChange: (value: "all" | "yes" | "no") => void;
}) {
  return (
    <div className="flex h-8 items-center overflow-hidden rounded-md border border-border/60">
      {(["no", "yes", "all"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "h-full flex-1 whitespace-nowrap px-3 text-[12px] transition-colors",
            value === option
              ? "bg-[#f5f5f5] font-medium text-foreground"
              : "bg-transparent font-normal text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            option !== "no" && "border-l border-border/60"
          )}
        >
          {option === "no" ? "Не прибули" : option === "yes" ? "Прибули" : "Всі"}
        </button>
      ))}
    </div>
  );
}

function ArrivalButton({
  arrived,
  isPending,
  onToggle,
}: {
  arrived: boolean;
  isPending: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={arrived ? "outline" : "default"}
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="h-8 min-w-28 gap-1.5 text-[12px]"
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : arrived ? (
        <Check size={13} />
      ) : null}
      {arrived ? "Прибув" : "Позначити"}
    </Button>
  );
}

function ArrivalDot({ arrived }: { arrived: boolean }) {
  return (
    <span
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        arrived ? "bg-[#1a7f37]" : "bg-[#cccccc]"
      )}
    />
  );
}

function getTicketGrade(ticket: CheckInTicket) {
  return ticket.updated_grade ?? ticket.grade;
}
