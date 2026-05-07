import { z } from "zod";

const cookieConsentAnalyticsActionSchema = z.enum([
  "accept_all",
  "reject_all",
  "save_settings",
]);

const cookieConsentAnalyticsSurfaceSchema = z.enum(["banner", "settings"]);

const cookieConsentAnalyticsSummarySchema = z.object({
  acceptAll: z.number(),
  marketingAccepted: z.number(),
  marketingRejected: z.number(),
  rejectAll: z.number(),
  saveSettings: z.number(),
  total: z.number(),
});

const cookieConsentAnalyticsDailyPointSchema = z.object({
  acceptAll: z.number(),
  date: z.string(),
  marketingAccepted: z.number(),
  marketingRejected: z.number(),
  rejectAll: z.number(),
  saveSettings: z.number(),
  total: z.number(),
});

const cookieConsentAnalyticsBreakdownItemSchema = z.object({
  count: z.number(),
  key: cookieConsentAnalyticsActionSchema.or(cookieConsentAnalyticsSurfaceSchema),
});

const cookieConsentAnalyticsVersionBreakdownItemSchema = z.object({
  consentVersion: z.number(),
  count: z.number(),
});

const cookieConsentAnalyticsEventSchema = z.object({
  action: cookieConsentAnalyticsActionSchema,
  consentVersion: z.number(),
  createdAt: z.string(),
  id: z.string(),
  marketing: z.boolean(),
  surface: cookieConsentAnalyticsSurfaceSchema,
});

const cookieConsentAnalyticsSchema = z.object({
  actionBreakdown: z.array(cookieConsentAnalyticsBreakdownItemSchema),
  recent: z.array(cookieConsentAnalyticsEventSchema),
  summary: cookieConsentAnalyticsSummarySchema,
  surfaceBreakdown: z.array(cookieConsentAnalyticsBreakdownItemSchema),
  timeline: z.array(cookieConsentAnalyticsDailyPointSchema),
  versionBreakdown: z.array(cookieConsentAnalyticsVersionBreakdownItemSchema),
});

export type CookieConsentAnalytics = z.infer<
  typeof cookieConsentAnalyticsSchema
>;
export type CookieConsentAnalyticsAction = z.infer<
  typeof cookieConsentAnalyticsActionSchema
>;
export type CookieConsentAnalyticsBreakdownItem = z.infer<
  typeof cookieConsentAnalyticsBreakdownItemSchema
>;
export type CookieConsentAnalyticsDailyPoint = z.infer<
  typeof cookieConsentAnalyticsDailyPointSchema
>;
export type CookieConsentAnalyticsEvent = z.infer<
  typeof cookieConsentAnalyticsEventSchema
>;
export type CookieConsentAnalyticsSurface = z.infer<
  typeof cookieConsentAnalyticsSurfaceSchema
>;
export type CookieConsentAnalyticsSummary = z.infer<
  typeof cookieConsentAnalyticsSummarySchema
>;
export type CookieConsentAnalyticsVersionBreakdownItem = z.infer<
  typeof cookieConsentAnalyticsVersionBreakdownItemSchema
>;

export function parseCookieConsentAnalytics(
  value: unknown
): CookieConsentAnalytics {
  return cookieConsentAnalyticsSchema.parse(value);
}
