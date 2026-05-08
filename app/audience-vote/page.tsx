import type { Metadata } from "next";
import Script from "next/script";

import { AudienceVoteMiniAppPage } from "@/pages/audience-vote-mini-app";

export const metadata: Metadata = {
  title:
    "\u0413\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f | Nail Moment",
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
