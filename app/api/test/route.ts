import { logtail } from "@/shared/logtail";

export async function GET() {
  logtail.info("test log");
  return new Response("Hello World!");
}
