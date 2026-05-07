import { count, desc, sql, type SQL } from "drizzle-orm";

import type { DrizzleDB } from "@/shared/db";
import {
  cookieConsentEventTable,
  type InsertCookieConsentEvent,
} from "@/shared/db/schema";
import { insertCookieConsentEventSchema } from "@/shared/db/schema.zod";

export type CookieConsentAnalyticsSummary = {
  acceptAll: number;
  marketingAccepted: number;
  marketingRejected: number;
  rejectAll: number;
  saveSettings: number;
  total: number;
};

export type CookieConsentAnalyticsEvent = {
  action: InsertCookieConsentEvent["action"];
  consentVersion: number;
  createdAt: string;
  id: string;
  marketing: boolean;
  surface: InsertCookieConsentEvent["surface"];
};

export type CookieConsentAnalytics = {
  recent: CookieConsentAnalyticsEvent[];
  summary: CookieConsentAnalyticsSummary;
};

export interface ICookieConsentAnalyticsService {
  addEvent: (event: InsertCookieConsentEvent) => Promise<void>;
  getAnalytics: () => Promise<CookieConsentAnalytics>;
}

const countWhere = (condition: SQL) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

export function createCookieConsentAnalyticsService(
  db: DrizzleDB
): ICookieConsentAnalyticsService {
  const addEvent = async (event: InsertCookieConsentEvent) => {
    const validatedEvent = insertCookieConsentEventSchema.parse(event);
    await db.insert(cookieConsentEventTable).values(validatedEvent);
  };

  const getAnalytics = async (): Promise<CookieConsentAnalytics> => {
    const [summaryRow] = await db
      .select({
        acceptAll: countWhere(
          sql`${cookieConsentEventTable.action} = 'accept_all'`
        ),
        marketingAccepted: countWhere(
          sql`${cookieConsentEventTable.marketing} = true`
        ),
        marketingRejected: countWhere(
          sql`${cookieConsentEventTable.marketing} = false`
        ),
        rejectAll: countWhere(
          sql`${cookieConsentEventTable.action} = 'reject_all'`
        ),
        saveSettings: countWhere(
          sql`${cookieConsentEventTable.action} = 'save_settings'`
        ),
        total: count(),
      })
      .from(cookieConsentEventTable);

    const recentRows = await db
      .select({
        action: cookieConsentEventTable.action,
        consentVersion: cookieConsentEventTable.consent_version,
        createdAt: cookieConsentEventTable.created_at,
        id: cookieConsentEventTable.id,
        marketing: cookieConsentEventTable.marketing,
        surface: cookieConsentEventTable.surface,
      })
      .from(cookieConsentEventTable)
      .orderBy(desc(cookieConsentEventTable.created_at))
      .limit(10);

    return {
      summary: {
        acceptAll: summaryRow?.acceptAll ?? 0,
        marketingAccepted: summaryRow?.marketingAccepted ?? 0,
        marketingRejected: summaryRow?.marketingRejected ?? 0,
        rejectAll: summaryRow?.rejectAll ?? 0,
        saveSettings: summaryRow?.saveSettings ?? 0,
        total: summaryRow?.total ?? 0,
      },
      recent: recentRows.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  };

  return {
    addEvent,
    getAnalytics,
  };
}
