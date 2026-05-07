"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchCookieConsentAnalytics,
  type CookieConsentAnalytics,
  type CookieConsentAnalyticsAction,
} from "@/entities/cookie-consent";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/lib/cn";
import {
  buildActionBreakdown,
  buildCookieConsentTrend,
  buildMarketingBreakdown,
  buildSurfaceBreakdown,
  formatConsentAction,
  formatConsentPercent,
  formatConsentSurface,
  formatEventTime,
} from "../model/cookie-analytics-page";
import { CookieConsentBreakdownCharts } from "./cookie-consent-breakdown-charts";
import { CookieConsentTrendChart } from "./cookie-consent-trend-chart";

const cookieAnalyticsQueryKey = ["cookie-consent-analytics"] as const;

export default function CookieAnalyticsPage() {
  const { data, isError, isFetching, isLoading } = useQuery({
    queryKey: cookieAnalyticsQueryKey,
    queryFn: fetchCookieConsentAnalytics,
    staleTime: 60_000,
  });

  const trend = useMemo(
    () => (data ? buildCookieConsentTrend(data) : []),
    [data]
  );
  const actionBreakdown = useMemo(
    () => (data ? buildActionBreakdown(data) : []),
    [data]
  );
  const marketingBreakdown = useMemo(
    () => (data ? buildMarketingBreakdown(data) : []),
    [data]
  );
  const surfaceBreakdown = useMemo(
    () => (data ? buildSurfaceBreakdown(data) : []),
    [data]
  );

  if (isLoading) {
    return (
      <div className="page-container py-6">
        <Skeleton className="h-[70vh] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page-container flex flex-col gap-4 py-6">
        <h1 className="text-heading-1">Аналітика згод</h1>
        <p className="font-medium text-destructive">
          Не вдалося завантажити аналітику згод.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container flex flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-1">Аналітика згод</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Анонімні події згоди з nailmoment.pl
          </p>
        </div>
        {isFetching ? (
          <span className="text-xs text-muted-foreground">Оновлення...</span>
        ) : null}
      </div>

      <SummaryGrid analytics={data} />

      <CookieConsentTrendChart data={trend} />

      <CookieConsentBreakdownCharts
        actionData={actionBreakdown}
        marketingData={marketingBreakdown}
        surfaceData={surfaceBreakdown}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
        <VersionCard analytics={data} />
        <RecentEventsTable analytics={data} />
      </div>
    </div>
  );
}

function SummaryGrid({ analytics }: { analytics: CookieConsentAnalytics }) {
  const { summary } = analytics;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <MetricCard label="Усього" value={summary.total} />
      <MetricCard label="Прийняли всі" value={summary.acceptAll} />
      <MetricCard
        detail={formatConsentPercent(summary.marketingAccepted, summary.total)}
        label="Маркетинг: так"
        value={summary.marketingAccepted}
      />
      <MetricCard
        detail={formatConsentPercent(summary.marketingRejected, summary.total)}
        label="Маркетинг: ні"
        value={summary.marketingRejected}
      />
      <MetricCard label="Відхилили всі" value={summary.rejectAll} />
      <MetricCard label="Налаштування" value={summary.saveSettings} />
    </div>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: number;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
          {detail ? (
            <span className="text-xs text-muted-foreground">{detail}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function VersionCard({ analytics }: { analytics: CookieConsentAnalytics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Версії згоди</CardTitle>
        <CardDescription>Події за версією політики</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {analytics.versionBreakdown.length > 0 ? (
          analytics.versionBreakdown.map((item) => (
            <div
              key={item.consentVersion}
              className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="font-medium">Версія {item.consentVersion}</span>
              <div className="text-right">
                <div className="font-medium tabular-nums">{item.count}</div>
                <div className="text-xs text-muted-foreground">
                  {formatConsentPercent(item.count, analytics.summary.total)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Поки немає версій згоди.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEventsTable({
  analytics,
}: {
  analytics: CookieConsentAnalytics;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Останні події</CardTitle>
        <CardDescription>
          Найновіші анонімні рішення щодо файлів cookie
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Час</TableHead>
              <TableHead>Дія</TableHead>
              <TableHead>Місце</TableHead>
              <TableHead>Маркетинг</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.recent.length > 0 ? (
              analytics.recent.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatEventTime(event.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="rounded-md"
                      variant={getActionBadgeVariant(event.action)}
                    >
                      {formatConsentAction(event.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatConsentSurface(event.surface)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-medium",
                        event.marketing
                          ? "text-success"
                          : "text-muted-foreground"
                      )}
                    >
                      {event.marketing ? "Так" : "Ні"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={4}
                >
                  Поки немає подій згоди.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getActionBadgeVariant(action: CookieConsentAnalyticsAction) {
  if (action === "accept_all") {
    return "success";
  }

  if (action === "reject_all") {
    return "destructive";
  }

  return "outline";
}
