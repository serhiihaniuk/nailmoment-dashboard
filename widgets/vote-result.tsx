"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SPEAKERS } from "@/shared/const";

type VoteResultRaw = { video: string; total: number | string };
type VoteResult = { id: string; name: string; total: number; pct: number };

const fetchVoteResults = async (): Promise<VoteResultRaw[]> => {
  const res = await fetch("/api/speaker_vote");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export function VoteResultsTable() {
  const {
    data: raw,
    isLoading,
    isError,
    error,
  } = useQuery<VoteResultRaw[], Error>({
    queryKey: ["voteResults"],
    queryFn: fetchVoteResults,
    refetchInterval: 20000,
    staleTime: 5000,
  });

  const results: VoteResult[] = useMemo(() => {
    if (!raw?.length) return [];
    const totalVotes = raw.reduce((sum, r) => sum + Number(r.total), 0);
    if (!totalVotes) return [];
    const nameById = Object.fromEntries(SPEAKERS.map((s) => [s.id, s.name]));
    return raw
      .map((r) => {
        const total = Number(r.total);
        const pct = Number(((total / totalVotes) * 100).toFixed(1));
        return {
          id: r.video,
          name: nameById[r.video] ?? r.video,
          total,
          pct,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [raw]);

  const totalVotes = results.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading-1">Результати голосування: Спікер</h2>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="text-[12px] text-muted-foreground flex items-center gap-1.5">
          <span>{totalVotes} голосів</span>
          <span className="text-border">·</span>
          <span>{results.length} спікерів</span>
        </div>
      )}

      {isError && (
        <p className="text-destructive font-medium">
          Помилка: {error?.message}
        </p>
      )}
      {isLoading && <Skeleton className="h-50 w-full rounded-xl" />}

      {results.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-white shadow-surface overflow-hidden animate-in-fade">
          {/* Desktop table */}
          <div className="hidden md:block **:data-[slot=table-container]:border-0 **:data-[slot=table-container]:rounded-none **:data-[slot=table-container]:bg-transparent">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Спікер</TableHead>
                  <TableHead className="text-center">Голосів</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="w-50"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center font-semibold tabular-nums">
                      {r.total}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground tabular-nums">
                      {r.pct}%
                    </TableCell>
                    <TableCell>
                      <div className="w-full bg-muted/50 rounded-full h-1.5">
                        <div
                          className="bg-foreground/20 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden flex flex-col">
            {results.map((r, i) => (
              <div
                key={r.id}
                className="px-4 py-3 border-b border-border/40 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-muted-foreground/60 tabular-nums w-5">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium truncate">
                      {r.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] font-semibold tabular-nums">
                      {r.total}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {r.pct}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 w-full bg-muted/50 rounded-full h-1">
                  <div
                    className="bg-foreground/20 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !results.length && !isError && (
        <p className="text-muted-foreground">Дані відсутні.</p>
      )}
    </div>
  );
}
