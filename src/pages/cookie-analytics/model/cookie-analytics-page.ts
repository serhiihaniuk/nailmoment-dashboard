import type {
  CookieConsentAnalytics,
  CookieConsentAnalyticsAction,
  CookieConsentAnalyticsBreakdownItem,
  CookieConsentAnalyticsSurface,
} from "@/entities/cookie-consent";

export type CookieConsentTrendPoint = ReturnType<
  typeof buildCookieConsentTrend
>[number];

export type CookieConsentBreakdownViewItem = {
  color: string;
  count: number;
  key: string;
  label: string;
};

const chartDateFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
});

const eventDateTimeFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
});

const actionLabels = {
  accept_all: "Прийняли всі",
  reject_all: "Відхилили всі",
  save_settings: "Зберегли налаштування",
} satisfies Record<CookieConsentAnalyticsAction, string>;

const surfaceLabels = {
  banner: "Банер",
  settings: "Налаштування",
} satisfies Record<CookieConsentAnalyticsSurface, string>;

export const actionColors = {
  accept_all: "var(--success)",
  reject_all: "var(--destructive)",
  save_settings: "var(--chart-2)",
} satisfies Record<CookieConsentAnalyticsAction, string>;

export const surfaceColors = {
  banner: "var(--chart-1)",
  settings: "var(--chart-3)",
} satisfies Record<CookieConsentAnalyticsSurface, string>;

const actionOrder = [
  "accept_all",
  "reject_all",
  "save_settings",
] as const satisfies readonly CookieConsentAnalyticsAction[];

const surfaceOrder = [
  "banner",
  "settings",
] as const satisfies readonly CookieConsentAnalyticsSurface[];

export function buildCookieConsentTrend(analytics: CookieConsentAnalytics) {
  return analytics.timeline.map((point) => ({
    ...point,
    label: formatChartDate(point.date),
  }));
}

export function buildActionBreakdown(
  analytics: CookieConsentAnalytics
): CookieConsentBreakdownViewItem[] {
  return actionOrder.map((action) => {
    const item = findBreakdownItem(analytics.actionBreakdown, action);

    return {
      color: actionColors[action],
      count: item?.count ?? 0,
      key: action,
      label: formatConsentAction(action),
    };
  });
}

export function buildSurfaceBreakdown(
  analytics: CookieConsentAnalytics
): CookieConsentBreakdownViewItem[] {
  return surfaceOrder.map((surface) => {
    const item = findBreakdownItem(analytics.surfaceBreakdown, surface);

    return {
      color: surfaceColors[surface],
      count: item?.count ?? 0,
      key: surface,
      label: formatConsentSurface(surface),
    };
  });
}

export function buildMarketingBreakdown(
  analytics: CookieConsentAnalytics
): CookieConsentBreakdownViewItem[] {
  return [
    {
      color: "var(--success)",
      count: analytics.summary.marketingAccepted,
      key: "marketingAccepted",
      label: "Маркетинг: так",
    },
    {
      color: "var(--destructive)",
      count: analytics.summary.marketingRejected,
      key: "marketingRejected",
      label: "Маркетинг: ні",
    },
  ];
}

export function formatConsentAction(action: CookieConsentAnalyticsAction) {
  return actionLabels[action];
}

export function formatConsentSurface(surface: CookieConsentAnalyticsSurface) {
  return surfaceLabels[surface];
}

export function formatConsentPercent(value: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

export function formatEventTime(value: string) {
  return eventDateTimeFormatter.format(new Date(value));
}

function formatChartDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return chartDateFormatter.format(date);
}

function findBreakdownItem(
  items: CookieConsentAnalyticsBreakdownItem[],
  key: CookieConsentAnalyticsAction | CookieConsentAnalyticsSurface
) {
  return items.find((item) => item.key === key);
}
