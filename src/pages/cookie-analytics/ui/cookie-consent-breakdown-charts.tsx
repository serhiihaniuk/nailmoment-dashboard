"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import {
  formatConsentPercent,
  type CookieConsentBreakdownViewItem,
} from "../model/cookie-analytics-page";

const breakdownChartConfig = {
  count: {
    label: "Події",
  },
} satisfies ChartConfig;

export function CookieConsentBreakdownCharts({
  actionData,
  marketingData,
  surfaceData,
}: {
  actionData: CookieConsentBreakdownViewItem[];
  marketingData: CookieConsentBreakdownViewItem[];
  surfaceData: CookieConsentBreakdownViewItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <BreakdownChartCard
        title="Розподіл дій"
        description="Прийняли всі, відхилили всі або зберегли налаштування"
        data={actionData}
      />
      <BreakdownChartCard
        title="Маркетингова згода"
        description="Як часто дозволяють маркетингові файли cookie"
        data={marketingData}
      />
      <BreakdownChartCard
        title="Місце вибору"
        description="Банер або вікно налаштувань"
        data={surfaceData}
      />
    </div>
  );
}

function BreakdownChartCard({
  data,
  description,
  title,
}: {
  data: CookieConsentBreakdownViewItem[];
  description: string;
  title: string;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="w-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={breakdownChartConfig}
          className="aspect-auto h-62.5 w-full"
        >
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, "auto"]}
              width={32}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="count" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <ChartStatsList items={data} total={total} />
      </CardFooter>
    </Card>
  );
}

function ChartStatsList({
  items,
  total,
}: {
  items: CookieConsentBreakdownViewItem[];
  total: number;
}) {
  return (
    <div className="grid w-full gap-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="grid grid-cols-[1fr_auto] items-start gap-3 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate font-medium leading-none">
              {item.label}
            </span>
          </div>
          <div className="text-right">
            <div className="font-medium tabular-nums leading-none">
              {item.count}
            </div>
            <div className="mt-1 text-xs tabular-nums leading-none text-muted-foreground">
              {formatConsentPercent(item.count, total)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
