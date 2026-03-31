// app/(admin)/vote-results/_components/vote-results-table.tsx
"use client";

import React, { useMemo } from "react";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Результати голосування народний Спікер</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {isError && (
          <p className="text-destructive font-medium">Помилка: {error?.message}</p>
        )}
        {isLoading && <Skeleton className="h-24 w-full" />}

        {results.length > 0 && (
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Спікер</TableHead>
                  {/* <TableHead>Відео</TableHead> */}
                  <TableHead className="text-center">Голосів</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    {/* <TableCell>{r.id}</TableCell> */}
                    <TableCell className="text-center font-semibold">
                      {r.total}
                    </TableCell>
                    <TableCell className="text-center">{r.pct}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && !results.length && !isError && (
          <p className="text-muted-foreground">Дані відсутні.</p>
        )}
      </CardContent>
    </Card>
  );
}
