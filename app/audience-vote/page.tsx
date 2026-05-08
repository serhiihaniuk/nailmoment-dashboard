import type { Metadata } from "next";
import Script from "next/script";

import { AudienceVoteMiniAppPage } from "@/pages/audience-vote-mini-app";

export const metadata: Metadata = {
  title: "Audience Vote | Nail Moment",
};

export default function Page() {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <AudienceVoteMiniAppPage />
    </>
  );
}
