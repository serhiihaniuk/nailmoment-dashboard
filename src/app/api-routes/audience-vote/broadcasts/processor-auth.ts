import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  readOptionalEnv,
  readTelegramAudienceVoteProcessorSecret,
} from "@/shared/config/env";

const PROCESSOR_SECRET_HEADER = "x-audience-vote-processor-secret";

export function validateAudienceVoteBroadcastProcessorSecret(
  request: Request
) {
  const providedSecret = readProvidedProcessorSecret(request);
  const acceptedSecrets = [
    readTelegramAudienceVoteProcessorSecret(),
    readOptionalEnv("CRON_SECRET"),
  ].filter((secret): secret is string => typeof secret === "string");

  const authorized =
    providedSecret &&
    acceptedSecrets.some((secret) => timingSafeStringEqual(providedSecret, secret));

  if (authorized) {
    return undefined;
  }

  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function readProvidedProcessorSecret(request: Request) {
  const explicitSecret = request.headers.get(PROCESSOR_SECRET_HEADER)?.trim();
  if (explicitSecret) return explicitSecret;

  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
