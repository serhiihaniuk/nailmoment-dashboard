import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart';
import { TICKET_TYPE_LIST } from '@/entities/ticket';
import { TICKET_TYPE_BADGE_COLORS } from '@/entities/ticket/index.client';
import type { TicketWithFinance } from '@/entities/ticket';
import {
  SALE_SOURCE_OPTIONS,
  type SaleSource,
  type TicketGrade,
} from '../model/constants';
import {
  dateInputValue,
  formatChartZlotyTooltip,
  formatCompactZloty,
  formatPercent,
  formatZloty,
  toMoneyNumber,
} from '../model/utils';

export type FinanceChartData = ReturnType<typeof buildFinanceCharts>;

const gradeRevenueChartConfig = {
  standard: {
    label: "Standard",
    color: TICKET_TYPE_BADGE_COLORS.standard.border,
  },
  maxi: {
    label: "Maxi",
    color: TICKET_TYPE_BADGE_COLORS.maxi.border,
  },
  vip: {
    label: "VIP",
    color: TICKET_TYPE_BADGE_COLORS.vip.background,
  },
} satisfies ChartConfig;

const saleSourceChartConfig = {
  amount: {
    label: "Сума",
  },
  site: {
    label: "Сайт",
    color: "var(--chart-1)",
  },
  direct_transfer: {
    label: "Прямий переказ",
    color: "var(--chart-2)",
  },
  other: {
    label: "Інше",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const paymentStatusChartConfig = {
  count: {
    label: "Квитки",
  },
  paid: {
    label: "Оплачено",
    color: "var(--success)",
  },
  partial: {
    label: "Часткова оплата",
    color: "var(--warning)",
  },
  unpaid: {
    label: "Очікують оплату",
    color: "var(--muted-foreground)",
  },
  overdue: {
    label: "Прострочені",
    color: "var(--destructive)",
  },
  untracked: {
    label: "Без платежів",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

const cashflowChartConfig = {
  paid: {
    label: "Надійшло",
    color: "var(--success)",
  },
  expected: {
    label: "Заплановано",
    color: "var(--warning)",
  },
} satisfies ChartConfig;

export function FinanceCharts({ data }: { data: FinanceChartData }) {
  const gradeTotals = chartGradeOrder.map((grade) => ({
    key: grade,
    label: grade.toUpperCase(),
    value: data.gradeTimeline.reduce((sum, item) => sum + item[grade], 0),
    color: chartGradeFill[grade],
  }));
  const gradeTotal = gradeTotals.reduce((sum, item) => sum + item.value, 0);
  const sourceTotal = data.saleSources.reduce(
    (sum, source) => sum + source.amount,
    0
  );
  const statusTotal = data.paymentStatuses.reduce(
    (sum, status) => sum + status.count,
    0
  );
  const cashflowStats = [
    {
      key: "paid",
      label: "Надійшло",
      value: data.cashflow.reduce((sum, item) => sum + item.paid, 0),
      color: "var(--success)",
    },
    {
      key: "expected",
      label: "Заплановано",
      value: data.cashflow.reduce((sum, item) => sum + item.expected, 0),
      color: "var(--warning)",
    },
  ];
  const cashflowTotal = cashflowStats.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Сума за тарифами</CardTitle>
          <CardDescription>Продажі Standard, Maxi і VIP за датами</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={gradeRevenueChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <AreaChart
              accessibilityLayer
              data={data.gradeTimeline}
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
                domain={[0, "auto"]}
                width={52}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactZloty(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    valueFormatter={formatChartZlotyTooltip}
                  />
                }
              />
              <Area
                dataKey="standard"
                type="monotone"
                stackId="tickets"
                fill="var(--color-standard)"
                fillOpacity={0.35}
                stroke="var(--color-standard)"
              />
              <Area
                dataKey="maxi"
                type="monotone"
                stackId="tickets"
                fill="var(--color-maxi)"
                fillOpacity={0.35}
                stroke="var(--color-maxi)"
              />
              <Area
                dataKey="vip"
                type="monotone"
                stackId="tickets"
                fill="var(--color-vip)"
                fillOpacity={0.35}
                stroke="var(--color-vip)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <ChartStatsList
            items={gradeTotals}
            total={gradeTotal}
            formatValue={formatZloty}
          />
        </CardFooter>
      </Card>

      <Card className="w-full">
        <CardHeader className="items-center pb-0">
          <CardTitle>Продажі за каналами</CardTitle>
          <CardDescription>Розподіл за каналами оплати</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={saleSourceChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <BarChart accessibilityLayer data={data.saleSources}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                domain={[0, "auto"]}
                width={52}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactZloty(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dashed"
                    valueFormatter={formatChartZlotyTooltip}
                  />
                }
              />
              <Bar dataKey="amount" radius={4}>
                {data.saleSources.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <ChartStatsList
            items={data.saleSources.map((source) => ({
              key: source.key,
              label: source.label,
              value: source.amount,
              detail: `${source.count} квитків`,
              color: chartSaleSourceLegendFill[source.key],
            }))}
            total={sourceTotal}
            formatValue={formatZloty}
          />
        </CardFooter>
      </Card>

      <Card className="w-full">
        <CardHeader className="items-center pb-0">
          <CardTitle>Статуси платежів</CardTitle>
          <CardDescription>Стан оплат за квитками</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={paymentStatusChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <BarChart accessibilityLayer data={data.paymentStatuses}>
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
                {data.paymentStatuses.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <ChartStatsList
            items={data.paymentStatuses.map((status) => ({
              key: status.key,
              label: status.label,
              value: status.count,
              color: chartPaymentStatusLegendFill[status.key],
            }))}
            total={statusTotal}
            formatValue={(value) => value.toLocaleString("uk-UA")}
          />
        </CardFooter>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Графік платежів</CardTitle>
          <CardDescription>Фактичні та заплановані надходження</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={cashflowChartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <AreaChart
              accessibilityLayer
              data={data.cashflow}
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
                domain={[0, "auto"]}
                width={52}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactZloty(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    valueFormatter={formatChartZlotyTooltip}
                  />
                }
              />
              <Area
                dataKey="paid"
                type="monotone"
                fill="var(--color-paid)"
                fillOpacity={0.35}
                stroke="var(--color-paid)"
              />
              <Area
                dataKey="expected"
                type="monotone"
                fill="var(--color-expected)"
                fillOpacity={0.2}
                stroke="var(--color-expected)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <ChartStatsList
            items={cashflowStats}
            total={cashflowTotal}
            formatValue={formatZloty}
          />
        </CardFooter>
      </Card>
    </div>
  );
}

type ChartStatItem = {
  key: string;
  label: string;
  value: number;
  detail?: string;
  color: string;
};

function ChartStatsList({
  items,
  total,
  formatValue,
}: {
  items: ChartStatItem[];
  total: number;
  formatValue: (value: number) => string;
}) {
  const visibleItems = items.filter((item) => item.value > 0);

  return (
    <div className="grid w-full gap-2">
      {visibleItems.length > 0 ? (
        visibleItems.map((item) => (
          <div
            key={item.key}
            className="grid grid-cols-[1fr_auto] items-start gap-3 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0">
                <div className="truncate font-medium leading-none">
                  {item.label}
                </div>
                {item.detail && (
                  <div className="mt-1 text-xs leading-none text-muted-foreground">
                    {item.detail}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium tabular-nums leading-none">
                {formatValue(item.value)}
              </div>
              <div className="mt-1 text-xs tabular-nums leading-none text-muted-foreground">
                {formatPercent(item.value, total)}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-muted-foreground">Немає даних</div>
      )}
    </div>
  );
}

const chartGradeOrder = ["standard", "maxi", "vip"] as const;
const chartSaleSourceOrder = ["site", "direct_transfer", "other"] as const;
const chartPaymentStatusOrder = [
  "paid",
  "partial",
  "unpaid",
  "overdue",
  "untracked",
] as const;

const chartGradeFill: Record<TicketGrade, string> = {
  standard: TICKET_TYPE_BADGE_COLORS.standard.border,
  maxi: TICKET_TYPE_BADGE_COLORS.maxi.border,
  vip: TICKET_TYPE_BADGE_COLORS.vip.background,
};

const chartSaleSourceFill: Record<SaleSource, string> = {
  site: "var(--color-site)",
  direct_transfer: "var(--color-direct_transfer)",
  other: "var(--color-other)",
};

const chartSaleSourceLegendFill: Record<SaleSource, string> = {
  site: "var(--chart-1)",
  direct_transfer: "var(--chart-2)",
  other: "var(--chart-3)",
};

const chartPaymentStatusFill: Record<
  (typeof chartPaymentStatusOrder)[number],
  string
> = {
  paid: "var(--color-paid)",
  partial: "var(--color-partial)",
  unpaid: "var(--color-unpaid)",
  overdue: "var(--color-overdue)",
  untracked: "var(--color-untracked)",
};

const chartPaymentStatusLegendFill: Record<
  (typeof chartPaymentStatusOrder)[number],
  string
> = {
  paid: "var(--success)",
  partial: "var(--warning)",
  unpaid: "var(--muted-foreground)",
  overdue: "var(--destructive)",
  untracked: "var(--muted-foreground)",
};

export function buildFinanceCharts(tickets: TicketWithFinance[]) {
  const gradeTimeline = new Map<
    string,
    { key: string; label: string } & Record<TicketGrade, number>
  >();
  const saleSources = new Map<
    SaleSource,
    {
      key: SaleSource;
      label: string;
      amount: number;
      count: number;
      fill: string;
    }
  >(
    chartSaleSourceOrder.map((source) => [
      source,
      {
        key: source,
        label: getSaleSourceLabel(source),
        amount: 0,
        count: 0,
        fill: chartSaleSourceFill[source],
      },
    ])
  );
  const paymentStatuses = new Map<
    (typeof chartPaymentStatusOrder)[number],
    {
      key: (typeof chartPaymentStatusOrder)[number];
      label: string;
      count: number;
      fill: string;
    }
  >(
    chartPaymentStatusOrder.map((status) => [
      status,
      {
        key: status,
        label: getPaymentStatusLabel(status),
        count: 0,
        fill: chartPaymentStatusFill[status],
      },
    ])
  );
  const cashflow = new Map<
    string,
    { key: string; label: string; paid: number; expected: number }
  >();

  for (const ticket of tickets) {
    const grossTotal = toMoneyNumber(ticket.finance_summary.gross_total);
    const grade = normalizeChartGrade(ticket.updated_grade ?? ticket.grade);
    const ticketDateKey = dateInputValue(ticket.date);
    if (ticketDateKey && grossTotal > 0) {
      const gradeBucket =
        gradeTimeline.get(ticketDateKey) ??
        {
          key: ticketDateKey,
          label: formatChartDate(ticketDateKey),
          standard: 0,
          maxi: 0,
          vip: 0,
        };

      gradeBucket[grade] += grossTotal;
      gradeTimeline.set(ticketDateKey, gradeBucket);
    }

    const saleSource = normalizeSaleSource(ticket.finance?.sale_source);
    const saleSourceBucket = saleSources.get(saleSource);
    if (saleSourceBucket) {
      saleSourceBucket.amount += grossTotal;
      saleSourceBucket.count += 1;
    }

    const status = normalizePaymentStatus(ticket.finance_summary.payment_status);
    const statusBucket = paymentStatuses.get(status);
    if (statusBucket) {
      statusBucket.count += 1;
    }

    for (const payment of ticket.payments) {
      const amount = toMoneyNumber(payment.amount);
      if (amount <= 0) continue;

      const dateKey = dateInputValue(payment.paid_date ?? payment.due_date);
      if (!dateKey) continue;

      const bucket =
        cashflow.get(dateKey) ??
        {
          key: dateKey,
          label: formatChartDate(dateKey),
          paid: 0,
          expected: 0,
        };

      if (payment.paid_date) {
        bucket.paid += amount;
      } else {
        bucket.expected += amount;
      }

      cashflow.set(dateKey, bucket);
    }
  }

  return {
    gradeTimeline: Array.from(gradeTimeline.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
    saleSources: Array.from(saleSources.values()).filter(
      (item) => item.count > 0 || item.amount > 0
    ),
    paymentStatuses: Array.from(paymentStatuses.values()).filter(
      (item) => item.count > 0
    ),
    cashflow: Array.from(cashflow.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
  };
}

function normalizeChartGrade(value: string | null | undefined): TicketGrade {
  const lowerValue = value?.toLowerCase();
  if (lowerValue === "standart") return "standard";
  if (
    lowerValue &&
    TICKET_TYPE_LIST.includes(lowerValue as TicketGrade)
  ) {
    return lowerValue as TicketGrade;
  }
  return "standard";
}

function normalizeSaleSource(value: string | null | undefined): SaleSource {
  if (chartSaleSourceOrder.includes(value as SaleSource)) {
    return value as SaleSource;
  }
  return "other";
}

function normalizePaymentStatus(
  value: string | null | undefined
): (typeof chartPaymentStatusOrder)[number] {
  if (
    chartPaymentStatusOrder.includes(
      value as (typeof chartPaymentStatusOrder)[number]
    )
  ) {
    return value as (typeof chartPaymentStatusOrder)[number];
  }
  return "untracked";
}

function getSaleSourceLabel(value: SaleSource): string {
  return SALE_SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function getPaymentStatusLabel(
  value: (typeof chartPaymentStatusOrder)[number]
): string {
  const labels: Record<(typeof chartPaymentStatusOrder)[number], string> = {
    paid: "Оплачено",
    partial: "Часткова оплата",
    unpaid: "Очікують оплату",
    overdue: "Прострочені",
    untracked: "Без платежів",
  };
  return labels[value];
}

function formatChartDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}.${month}`;
}
