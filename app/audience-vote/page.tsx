import type { Metadata } from "next";
import Script from "next/script";

import { AudienceVoteMiniAppPage } from "@/pages/audience-vote-mini-app";
import { getDashboardSession } from "@/shared/better-auth/auth";

export const metadata: Metadata = {
  title:
    "\u0413\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f | Nail Moment",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const previewParam = Array.isArray(params.preview)
    ? params.preview[0]
    : params.preview;
  const wantsDashboardPreview =
    previewParam === "1" || previewParam === "true";
  const dashboardPreview =
    wantsDashboardPreview && Boolean(await getDashboardSession());

  return (
    <>
      {dashboardPreview ? null : (
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      )}
      <AudienceVoteMiniAppPage dashboardPreview={dashboardPreview} />
    </>
  );
}
