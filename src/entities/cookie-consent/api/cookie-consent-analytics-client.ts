import {
  parseCookieConsentAnalytics,
  type CookieConsentAnalytics,
} from "../model/cookie-consent-analytics";

export async function fetchCookieConsentAnalytics(): Promise<CookieConsentAnalytics> {
  const response = await fetch("/api/analytics/cookie-consent");

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return parseCookieConsentAnalytics(await response.json());
}
