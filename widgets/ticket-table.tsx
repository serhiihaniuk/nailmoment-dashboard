"use client";

import { FC, useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket } from "@/shared/db/schema";
import { TICKET_TYPE, TICKET_TYPE_LIST } from "@/shared/const";
import { cn } from "@/shared/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader, Search } from "lucide-react";
import { AddTicketDialog } from "@/features/add-ticket";
import { TicketPanelWrapper } from "@/widgets/ticket-panel";

async function fetchTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/ticket");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function matchesSubsequence(query: string, value?: string | null) {
  if (!value) return false;

  let queryIndex = 0;
  const normalizedValue = value.toLowerCase();

  for (const char of normalizedValue) {
    if (char === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) return true;
    }
  }

  return false;
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
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Run once on mount only — avoids reopening panel after user closes it
  useEffect(() => {
    const ticketParam = searchParams.get("ticket");
    if (ticketParam) setSelectedTicketId(ticketParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClosePanel = useCallback(() => setSelectedTicketId(null), []);
  const handleSelectTicket = useCallback(
    (id: string) => setSelectedTicketId(id),
    [],
  );

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
          t.id?.toLowerCase().includes(q) ||
          matchesSubsequence(q, t.id) ||
          t.name?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          matchesSubsequence(q, t.email) ||
          t.phone?.toLowerCase().includes(q) ||
          t.instagram?.toLowerCase().includes(q)
        );
      });
  }, [tickets, arrived, grade, buyType, query, showDeleted]);

  const stats = useMemo(() => {
    if (!tickets) return null;
    const active = tickets.filter((t) => !t.archived);
    return {
      total: active.length,
      arrived: active.filter((t) => t.arrived).length,
      remaining: active.filter((t) => !t.arrived).length,
      vip: active.filter(
        (t) => (t.updated_grade ?? t.grade)?.toLowerCase() === "vip",
      ).length,
    };
  }, [tickets]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading-1">
          Квитки{" "}
          {stats && (
            <span className="text-muted-foreground font-normal text-base">
              {stats.total}
            </span>
          )}
        </h2>
        <AddTicketDialog />
      </div>

      {/* Stats row — all uniform muted color */}
      {stats && (
        <div className="text-[12px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span>{stats.total} всього</span>
          <span className="text-border">·</span>
          <span>{stats.arrived} прибули</span>
          <span className="text-border">·</span>
          <span>{stats.remaining} не прибули</span>
          {stats.vip > 0 && (
            <>
              <span className="text-border">·</span>
              <span>{stats.vip} VIP</span>
            </>
          )}
        </div>
      )}

      {isError && (
        <p className="text-destructive font-medium">
          Помилка завантаження квитків
        </p>
      )}

      {isLoading && <Skeleton className="h-100 w-full rounded-xl" />}

      {!isLoading && (
        <>
          {/* ── DESKTOP ─────────────────────────────────────────────── */}
          <div className="hidden md:block rounded-xl border border-border/60 bg-white shadow-surface overflow-hidden animate-in-fade">
            {/* Toolbar  */}
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2 px-3 py-2 border-b border-border/40">
              <div className="relative grow max-w-55">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                />
                <Input
                  placeholder="Пошук..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-7 h-8 border-0 bg-transparent shadow-none text-base md:text-[13px] placeholder:text-muted-foreground/40"
                />
              </div>

              <div className="h-4 w-px bg-border/50 mx-1" />

              {/* Arrived — text segmented control */}
              <ArrivedSegment value={arrived} onChange={setArrived} />

              <div className="h-4 w-px bg-border/50 mx-1" />

              {/* Grade — segmented control */}
              <GradeSegment value={grade} onChange={setGrade} />

              <Select
                value={buyType}
                onValueChange={(v) =>
                  setBuyType((v as typeof buyType) || "all")
                }
              >
                <SelectTrigger className="h-8 gap-1 px-2 text-[12px] bg-transparent border-0 shadow-none hover:bg-muted/50 transition-colors rounded-md">
                  <span className="text-muted-foreground">Оплата:</span>
                  <SelectValue placeholder="Всі" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="manual">Direct</SelectItem>
                </SelectContent>
              </Select>

              <div className="h-4 w-px bg-border/50 mx-1" />

              <button
                type="button"
                onClick={() => setShowDeleted((p) => !p)}
                className={cn(
                  "h-8 px-2 rounded-md text-[12px] transition-colors",
                  showDeleted
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50",
                )}
              >
                Видалені
              </button>
            </div>

            {!filtered.length && !isError && (
              <p className="text-muted-foreground text-center py-12">
                Квитків не знайдено.
              </p>
            )}

            {filtered.length > 0 && (
              <div className="**:data-[slot=table-container]:border-0 **:data-[slot=table-container]:rounded-none **:data-[slot=table-container]:bg-transparent">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Ім&apos;я</TableHead>
                      <TableHead className="w-12 text-center">Stripe</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow
                        key={t.id}
                        className={cn(
                          "cursor-pointer",
                          t.archived &&
                            "bg-destructive/10 hover:bg-destructive/15",
                          selectedTicketId === t.id && "bg-muted/60",
                        )}
                        onClick={() => handleSelectTicket(t.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                t.arrived ? "bg-[#1a7f37]" : "bg-[#cccccc]",
                              )}
                            />
                            <span className="max-w-40 truncate inline-block font-medium">
                              {t.name}
                            </span>
                            {(t.updated_grade ?? t.grade)?.toLowerCase() ===
                              "vip" && (
                              <span className="text-[9px] uppercase tracking-wider font-semibold text-[#395500] border border-[#395500]/40 px-1 py-0 rounded">
                                vip
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground/50 text-[11px]">
                          {!t.stripe_event_id.startsWith("manual") && "S"}
                        </TableCell>
                        <TableCell>
                          {t.email ? (
                            <span className="text-muted-foreground">
                              {t.email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.instagram ? (
                            <span className="text-muted-foreground">
                              {t.instagram}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.phone ? (
                            <span className="text-muted-foreground">
                              {t.phone.replace(/\s+/g, "")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
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
                        <TableCell colSpan={6} className="text-center">
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
          </div>

          {/* ── MOBILE ──────────────────────────────────────────────── */}
          <div className="md:hidden flex flex-col gap-2 animate-in-fade">
            {/* Sticky search + filter — stacks above the card list */}
            <div className="sticky top-12 z-40 bg-white border border-border/60 rounded-xl shadow-surface">
              <div className="relative px-3 pt-2.5 pb-2 border-b border-border/40">
                <Search
                  size={14}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                />
                <Input
                  placeholder="Пошук..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-7 h-8 border-0 bg-transparent shadow-none text-base md:text-[13px] placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="px-3 py-2">
                <ArrivedSegment
                  value={arrived}
                  onChange={setArrived}
                  fullWidth
                />
              </div>
            </div>

            {/* Cards */}
            {!filtered.length && !isError && (
              <p className="text-muted-foreground text-center py-12">
                Квитків не знайдено.
              </p>
            )}
            {filtered.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-white shadow-surface overflow-hidden">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTicket(t.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border/40 last:border-b-0 transition-colors hover:bg-muted/30 active:bg-muted/50",
                      t.archived && "bg-destructive/5",
                      selectedTicketId === t.id && "bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            t.arrived ? "bg-[#1a7f37]" : "bg-[#cccccc]",
                          )}
                        />
                        <span className="text-[13px] font-medium truncate">
                          {t.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!t.stripe_event_id.startsWith("manual") && (
                          <span className="text-[10px] text-muted-foreground/50 font-medium bg-muted/60 px-1.5 py-0.5 rounded">
                            S
                          </span>
                        )}
                        {(t.updated_grade ?? t.grade)?.toLowerCase() ===
                          "vip" && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-[#395500] border border-[#395500]/40 px-1 py-0 rounded">
                            vip
                          </span>
                        )}
                      </div>
                    </div>
                    {t.email && (
                      <div className="mt-1 text-[12px] text-muted-foreground truncate pl-3.5">
                        {t.email}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Slide-out panel */}
      <TicketPanelWrapper
        ticketId={selectedTicketId}
        onClose={handleClosePanel}
      />
    </div>
  );
}

/* ── Shared segmented control for arrived filter ── */

const ArrivedSegment: FC<{
  value: "all" | "yes" | "no";
  onChange: (v: "all" | "yes" | "no") => void;
  fullWidth?: boolean;
}> = ({ value, onChange, fullWidth }) => (
  <div
    className={cn(
      "flex items-center h-8 rounded-md border border-border/60 overflow-hidden",
      fullWidth && "w-full",
    )}
  >
    {(["all", "yes", "no"] as const).map((v) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        className={cn(
          "flex-1 h-full px-3 text-[12px] transition-colors duration-150 whitespace-nowrap",
          value === v
            ? "bg-[#f5f5f5] text-foreground font-medium"
            : "bg-transparent text-muted-foreground font-normal hover:text-foreground hover:bg-muted/40",
          v !== "all" && "border-l border-border/60",
        )}
      >
        {v === "all" ? "Всі" : v === "yes" ? "Прибули" : "Не прибули"}
      </button>
    ))}
  </div>
);

const GRADE_OPTIONS = [
  { value: "all", label: "Всі" },
  { value: TICKET_TYPE.STANDARD, label: "Standard" },
  { value: TICKET_TYPE.MAXI, label: "Maxi" },
  { value: TICKET_TYPE.VIP, label: "VIP" },
] as const;

const GradeSegment: FC<{
  value: "all" | (typeof TICKET_TYPE_LIST)[number];
  onChange: (v: "all" | (typeof TICKET_TYPE_LIST)[number]) => void;
}> = ({ value, onChange }) => (
  <div className="flex items-center h-8 rounded-md border border-border/60 overflow-hidden">
    {GRADE_OPTIONS.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() =>
          onChange(opt.value as "all" | (typeof TICKET_TYPE_LIST)[number])
        }
        className={cn(
          "h-full px-3 text-[12px] transition-colors duration-150 whitespace-nowrap",
          value === opt.value
            ? "bg-[#f5f5f5] text-foreground font-medium"
            : "bg-transparent text-muted-foreground font-normal hover:text-foreground hover:bg-muted/40",
          opt.value !== "all" && "border-l border-border/60",
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
