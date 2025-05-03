import { Logtail } from "@logtail/node";

export const logtail = new Logtail(process.env.LOGTAIL_TOKEN!, {
  endpoint: process.env.LOGTAIL_URL!,
  throwExceptions: false,
});
