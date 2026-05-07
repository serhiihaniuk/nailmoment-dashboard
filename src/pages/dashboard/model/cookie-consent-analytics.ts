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

const cookieConsentAnalyticsEventSchema = z.object({
  action: cookieConsentAnalyticsActionSchema,
  consentVersion: z.number(),
  createdAt: z.string(),
  id: z.string(),
  marketing: z.boolean(),
  surface: cookieConsentAnalyticsSurfaceSchema,
});

const cookieConsentAnalyticsSchema = z.object({
  recent: z.array(cookieConsentAnalyticsEventSchema),
  summary: cookieConsentAnalyticsSummarySchema,
});

export type CookieConsentAnalytics = z.infer<
  typeof cookieConsentAnalyticsSchema
>;
export type CookieConsentAnalyticsEvent = z.infer<
  typeof cookieConsentAnalyticsEventSchema
>;

export function parseCookieConsentAnalytics(
  value: unknown
): CookieConsentAnalytics {
  return cookieConsentAnalyticsSchema.parse(value);
}
