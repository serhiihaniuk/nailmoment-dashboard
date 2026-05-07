"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCookieConsentAnalytics } from "@/pages/dashboard/api/cookie-consent-analytics-client";
import type { CookieConsentAnalyticsEvent } from "@/pages/dashboard/model/cookie-consent-analytics";

function formatPercent(value: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatEventAction(event: CookieConsentAnalyticsEvent) {
  if (event.action === "accept_all") {
    return "Accept all";
  }

  if (event.action === "reject_all") {
    return "Reject all";
  }

  return "Saved settings";
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function CookieConsentAnalyticsCard() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["cookie-consent-analytics"],
    queryFn: fetchCookieConsentAnalytics,
    staleTime: 60_000,
  });

  const stats = data?.summary;
  const marketingAcceptedPercent = useMemo(
    () =>
      stats
        ? formatPercent(stats.marketingAccepted, stats.total)
        : "0%",
    [stats]
  );
  const marketingRejectedPercent = useMemo(
    () =>
      stats
        ? formatPercent(stats.marketingRejected, stats.total)
        : "0%",
    [stats]
  );

  return (
    <section className="rounded-xl border border-border/60 bg-white p-4 shadow-surface">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Cookie consent</h2>
          <p className="text-sm text-muted-foreground">
            Anonymous accept/reject activity from nailmoment.pl
          </p>
        </div>
        {isLoading && (
          <span className="text-xs text-muted-foreground">Loading...</span>
        )}
        {isError && (
          <span className="text-xs text-destructive">Could not load</span>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <StatBlock label="Total" value={stats?.total ?? 0} />
        <StatBlock
          label="Marketing accepted"
          value={stats?.marketingAccepted ?? 0}
          detail={marketingAcceptedPercent}
        />
        <StatBlock
          label="Marketing rejected"
          value={stats?.marketingRejected ?? 0}
          detail={marketingRejectedPercent}
        />
        <StatBlock label="Reject all" value={stats?.rejectAll ?? 0} />
        <StatBlock label="Custom save" value={stats?.saveSettings ?? 0} />
      </div>

      {data?.recent.length ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {data.recent.map((event) => (
            <span
              key={event.id}
              className="rounded-md border border-border/60 px-2 py-1"
            >
              {formatEventTime(event.createdAt)} - {formatEventAction(event)} -{" "}
              {event.surface} - marketing {event.marketing ? "yes" : "no"}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatBlock({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {detail ? (
          <span className="text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </div>
    </div>
  );
}
