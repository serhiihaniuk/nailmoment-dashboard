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
    refetchInterval: 5000,
    staleTime: 3000,
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

      <CardContent className="px-0 min-h-20">
        {isError && (
          <p className="px-4 text-red-500">Помилка: {error?.message}</p>
        )}
        {isLoading && <Skeleton className="h-24 w-full" />}

        {results.length > 0 && (
          <div className="overflow-x-auto mx-2 rounded-md border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader className="bg-muted dark:bg-muted/50">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Спікер</TableHead>
                  <TableHead className="text-center">Голосів</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.name}</TableCell>
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
          <p className="px-4">Дані відсутні.</p>
        )}
      </CardContent>
    </Card>
  );
}
