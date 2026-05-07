"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { formatConsentPercent } from "../model/cookie-analytics-page";
import type { CookieConsentTrendPoint } from "../model/cookie-analytics-page";

const cookieTrendChartConfig = {
  acceptAll: {
    label: "Прийняли всі",
    color: "var(--success)",
  },
  rejectAll: {
    label: "Відхилили всі",
    color: "var(--destructive)",
  },
  saveSettings: {
    label: "Зберегли налаштування",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function CookieConsentTrendChart({
  data,
}: {
  data: CookieConsentTrendPoint[];
}) {
  const totals = data.reduce(
    (sum, point) => ({
      acceptAll: sum.acceptAll + point.acceptAll,
      rejectAll: sum.rejectAll + point.rejectAll,
      saveSettings: sum.saveSettings + point.saveSettings,
      total: sum.total + point.total,
    }),
    { acceptAll: 0, rejectAll: 0, saveSettings: 0, total: 0 }
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Динаміка згод</CardTitle>
        <CardDescription>
          Щоденні рішення щодо файлів cookie з nailmoment.pl
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer
            config={cookieTrendChartConfig}
            className="aspect-auto h-80 w-full"
          >
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ left: 0, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, "auto"]}
                width={36}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="acceptAll"
                type="monotone"
                stackId="consent"
                fill="var(--color-acceptAll)"
                fillOpacity={0.35}
                stroke="var(--color-acceptAll)"
              />
              <Area
                dataKey="saveSettings"
                type="monotone"
                stackId="consent"
                fill="var(--color-saveSettings)"
                fillOpacity={0.25}
                stroke="var(--color-saveSettings)"
              />
              <Area
                dataKey="rejectAll"
                type="monotone"
                stackId="consent"
                fill="var(--color-rejectAll)"
                fillOpacity={0.22}
                stroke="var(--color-rejectAll)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-80 w-full items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 text-sm text-muted-foreground">
            Поки немає подій згоди
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <ChartStatsList
          items={[
            {
              color: "var(--success)",
              key: "acceptAll",
              label: "Прийняли всі",
              value: totals.acceptAll,
            },
            {
              color: "var(--chart-2)",
              key: "saveSettings",
              label: "Зберегли налаштування",
              value: totals.saveSettings,
            },
            {
              color: "var(--destructive)",
              key: "rejectAll",
              label: "Відхилили всі",
              value: totals.rejectAll,
            },
          ]}
          total={totals.total}
        />
      </CardFooter>
    </Card>
  );
}

function ChartStatsList({
  items,
  total,
}: {
  items: Array<{
    color: string;
    key: string;
    label: string;
    value: number;
  }>;
  total: number;
}) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate font-medium">{item.label}</span>
          </div>
          <div className="text-right">
            <div className="font-medium tabular-nums">{item.value}</div>
            <div className="text-xs tabular-nums text-muted-foreground">
              {formatConsentPercent(item.value, total)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
