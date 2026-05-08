import { Bot, GrammyError, InlineKeyboard } from "grammy";

import {
  readTelegramAudienceVoteBotToken,
  readTelegramAudienceVoteMiniAppUrl,
} from "@/shared/config/env";
import type {
  AudienceVoteBroadcast,
  AudienceVoteBroadcastDelivery,
} from "@/shared/db/schema";
import type {
  ClaimAudienceVoteBroadcastDeliveryAttemptInput,
  AudienceVoteBroadcastDeliveryStage,
  AudienceVoteBroadcastStatus,
  AudienceVoteBroadcastSummary,
  GetDueAudienceVoteBroadcastDeliveriesInput,
  GetProcessableAudienceVoteBroadcastsInput,
  HasAttemptableAudienceVoteBroadcastDeliveriesInput,
  RecordAudienceVoteBroadcastDeliveryFailureInput,
} from "@/shared/db/service/audience-vote-broadcast-service";
import {
  AUDIENCE_VOTE_BROADCAST_CANARY_WAIT_MS,
  AUDIENCE_VOTE_BROADCAST_DELIVERY_BATCH_LIMIT,
} from "@/shared/db/service/audience-vote-broadcast-service";

const OPEN_VOTING_BUTTON_TEXT =
  "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f";
const DELIVERY_ATTEMPT_LOCK_MS = 5 * 60 * 1000;

export interface AudienceVoteBroadcastTelegramClient {
  sendMessage: (input: {
    includeOpenButton: boolean;
    messageText: string;
    telegramUserId: number;
  }) => Promise<void>;
}

export interface AudienceVoteBroadcastProcessorService {
  claimAudienceVoteBroadcastDeliveryAttempt: (
    input: ClaimAudienceVoteBroadcastDeliveryAttemptInput
  ) => Promise<AudienceVoteBroadcastDelivery | undefined>;
  deactivateAudienceVoteBroadcastVoter: (
    telegramUserId: number
  ) => Promise<void>;
  getAudienceVoteBroadcast: (
    id: string
  ) => Promise<AudienceVoteBroadcast | undefined>;
  getAudienceVoteBroadcastSummary: (
    id: string
  ) => Promise<AudienceVoteBroadcastSummary | undefined>;
  getDueAudienceVoteBroadcastDeliveries: (
    input: GetDueAudienceVoteBroadcastDeliveriesInput
  ) => Promise<AudienceVoteBroadcastDelivery[]>;
  getProcessableAudienceVoteBroadcasts: (
    input: GetProcessableAudienceVoteBroadcastsInput
  ) => Promise<AudienceVoteBroadcast[]>;
  hasAttemptableAudienceVoteBroadcastDeliveries: (
    input: HasAttemptableAudienceVoteBroadcastDeliveriesInput
  ) => Promise<boolean>;
  markAudienceVoteBroadcastCompleted: (input: {
    broadcastId: string;
    now?: Date;
  }) => Promise<AudienceVoteBroadcastSummary | undefined>;
  markAudienceVoteBroadcastDeliverySent: (
    id: string,
    sentAt?: Date
  ) => Promise<void>;
  markAudienceVoteBroadcastDeliverySkipped: (input: {
    id: string;
    now?: Date;
    reason: string;
  }) => Promise<void>;
  markAudienceVoteBroadcastFailed: (input: {
    broadcastId: string;
    now?: Date;
  }) => Promise<AudienceVoteBroadcastSummary | undefined>;
  markAudienceVoteBroadcastOperatorCanarySent: (input: {
    broadcastId: string;
    nextStageAt: Date;
    now?: Date;
  }) => Promise<AudienceVoteBroadcastSummary | undefined>;
  markAudienceVoteBroadcastReady: (input: {
    broadcastId: string;
    now?: Date;
  }) => Promise<AudienceVoteBroadcastSummary | undefined>;
  markAudienceVoteBroadcastVoterCanarySent: (input: {
    broadcastId: string;
    nextStageAt: Date;
    now?: Date;
  }) => Promise<AudienceVoteBroadcastSummary | undefined>;
  recordAudienceVoteBroadcastDeliveryFailure: (
    input: RecordAudienceVoteBroadcastDeliveryFailureInput
  ) => Promise<void>;
}

export interface ProcessAudienceVoteBroadcastInput {
  broadcastId: string;
  now?: Date;
  service: AudienceVoteBroadcastProcessorService;
  telegramClient?: AudienceVoteBroadcastTelegramClient;
}

export interface ProcessDueAudienceVoteBroadcastsInput {
  limit?: number;
  now?: Date;
  service: AudienceVoteBroadcastProcessorService;
  telegramClient?: AudienceVoteBroadcastTelegramClient;
}

export interface ProcessDueAudienceVoteBroadcastsResult {
  processed: AudienceVoteBroadcastSummary[];
}

interface SendDeliveryBatchResult {
  finalFailed: number;
  interrupted: boolean;
  sent: number;
}

export async function processDueAudienceVoteBroadcasts({
  limit = 10,
  now = new Date(),
  service,
  telegramClient = createTelegramBroadcastClient(),
}: ProcessDueAudienceVoteBroadcastsInput): Promise<
  ProcessDueAudienceVoteBroadcastsResult
> {
  const dueBroadcasts = await service.getProcessableAudienceVoteBroadcasts({
    limit,
    now,
  });
  const processed: AudienceVoteBroadcastSummary[] = [];

  for (const broadcast of dueBroadcasts) {
    const summary = await processAudienceVoteBroadcast({
      broadcastId: broadcast.id,
      now,
      service,
      telegramClient,
    });

    if (summary) {
      processed.push(summary);
    }
  }

  return { processed };
}

export async function processAudienceVoteBroadcast({
  broadcastId,
  now = new Date(),
  service,
  telegramClient = createTelegramBroadcastClient(),
}: ProcessAudienceVoteBroadcastInput): Promise<
  AudienceVoteBroadcastSummary | undefined
> {
  const broadcast = await service.getAudienceVoteBroadcast(broadcastId);
  if (!broadcast) return undefined;

  return processLoadedAudienceVoteBroadcast({
    broadcast,
    now,
    service,
    telegramClient,
  });
}

function createTelegramBroadcastClient(): AudienceVoteBroadcastTelegramClient {
  let bot: Bot | null = null;

  function getBot() {
    bot ??= new Bot(readTelegramAudienceVoteBotToken());
    return bot;
  }

  return {
    async sendMessage({ includeOpenButton, messageText, telegramUserId }) {
      const reply_markup = includeOpenButton
        ? new InlineKeyboard().webApp(
            OPEN_VOTING_BUTTON_TEXT,
            readTelegramAudienceVoteMiniAppUrl()
          )
        : undefined;
      const options = reply_markup ? { reply_markup } : undefined;

      await getBot().api.sendMessage(telegramUserId, messageText, options);
    },
  };
}

async function processLoadedAudienceVoteBroadcast({
  broadcast,
  now,
  service,
  telegramClient,
}: {
  broadcast: AudienceVoteBroadcast;
  now: Date;
  service: AudienceVoteBroadcastProcessorService;
  telegramClient: AudienceVoteBroadcastTelegramClient;
}): Promise<AudienceVoteBroadcastSummary | undefined> {
  if (isTerminalBroadcastStatus(broadcast.status)) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  if (broadcast.status !== "ready" && broadcast.next_stage_at > now) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  if (broadcast.status === "canary_operator_pending") {
    return processOperatorCanary({
      broadcast,
      now,
      service,
      telegramClient,
    });
  }

  if (broadcast.status === "canary_operator_sent") {
    return processVoterCanary({
      broadcast,
      now,
      service,
      telegramClient,
    });
  }

  if (broadcast.status === "canary_voters_sent") {
    const ready = await service.markAudienceVoteBroadcastReady({
      broadcastId: broadcast.id,
      now,
    });

    if (!ready) return undefined;

    return processLoadedAudienceVoteBroadcast({
      broadcast: ready,
      now,
      service,
      telegramClient,
    });
  }

  return processNormalDeliveries({
    broadcast,
    now,
    service,
    telegramClient,
  });
}

async function processOperatorCanary({
  broadcast,
  now,
  service,
  telegramClient,
}: {
  broadcast: AudienceVoteBroadcast;
  now: Date;
  service: AudienceVoteBroadcastProcessorService;
  telegramClient: AudienceVoteBroadcastTelegramClient;
}) {
  const result = await processDeliveryStage({
    broadcast,
    expectedStatus: "canary_operator_pending",
    limit: 1,
    now,
    service,
    stage: "operator_canary",
    telegramClient,
  });

  if (result.interrupted) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  if (result.finalFailed > 0) {
    return service.markAudienceVoteBroadcastFailed({
      broadcastId: broadcast.id,
      now,
    });
  }

  const hasPending = await service.hasAttemptableAudienceVoteBroadcastDeliveries({
    broadcastId: broadcast.id,
    stage: "operator_canary",
  });

  if (hasPending) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  const summary = await service.getAudienceVoteBroadcastSummary(broadcast.id);

  if (summary?.delivery_counts.operator_canary.failed) {
    return service.markAudienceVoteBroadcastFailed({
      broadcastId: broadcast.id,
      now,
    });
  }

  return service.markAudienceVoteBroadcastOperatorCanarySent({
    broadcastId: broadcast.id,
    nextStageAt: new Date(now.getTime() + AUDIENCE_VOTE_BROADCAST_CANARY_WAIT_MS),
    now,
  });
}

async function processVoterCanary({
  broadcast,
  now,
  service,
  telegramClient,
}: {
  broadcast: AudienceVoteBroadcast;
  now: Date;
  service: AudienceVoteBroadcastProcessorService;
  telegramClient: AudienceVoteBroadcastTelegramClient;
}) {
  const result = await processDeliveryStage({
    broadcast,
    expectedStatus: "canary_operator_sent",
    limit: broadcast.canary_voter_limit + 1,
    now,
    service,
    stage: "voter_canary",
    telegramClient,
  });

  if (result.interrupted) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  const hasPending = await service.hasAttemptableAudienceVoteBroadcastDeliveries({
    broadcastId: broadcast.id,
    stage: "voter_canary",
  });

  if (hasPending) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  return service.markAudienceVoteBroadcastVoterCanarySent({
    broadcastId: broadcast.id,
    nextStageAt: new Date(now.getTime() + AUDIENCE_VOTE_BROADCAST_CANARY_WAIT_MS),
    now,
  });
}

async function processNormalDeliveries({
  broadcast,
  now,
  service,
  telegramClient,
}: {
  broadcast: AudienceVoteBroadcast;
  now: Date;
  service: AudienceVoteBroadcastProcessorService;
  telegramClient: AudienceVoteBroadcastTelegramClient;
}) {
  const result = await processDeliveryStage({
    broadcast,
    expectedStatus: "ready",
    limit: AUDIENCE_VOTE_BROADCAST_DELIVERY_BATCH_LIMIT,
    now,
    service,
    stage: "normal",
    telegramClient,
  });

  if (result.interrupted) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  const hasPending = await service.hasAttemptableAudienceVoteBroadcastDeliveries({
    broadcastId: broadcast.id,
    stage: "normal",
  });

  if (hasPending) {
    return service.getAudienceVoteBroadcastSummary(broadcast.id);
  }

  return service.markAudienceVoteBroadcastCompleted({
    broadcastId: broadcast.id,
    now,
  });
}

async function processDeliveryStage({
  broadcast,
  expectedStatus,
  limit,
  now,
  service,
  stage,
  telegramClient,
}: {
  broadcast: AudienceVoteBroadcast;
  expectedStatus: AudienceVoteBroadcastStatus;
  limit: number;
  now: Date;
  service: AudienceVoteBroadcastProcessorService;
  stage: AudienceVoteBroadcastDeliveryStage;
  telegramClient: AudienceVoteBroadcastTelegramClient;
}): Promise<SendDeliveryBatchResult> {
  const deliveries = await service.getDueAudienceVoteBroadcastDeliveries({
    broadcastId: broadcast.id,
    limit,
    now,
    stage,
  });

  return sendDeliveryBatch({
    deliveries,
    expectedStatus,
    includeOpenButton: broadcast.include_open_button,
    messageText: broadcast.message_text,
    now,
    service,
    telegramClient,
  });
}

async function sendDeliveryBatch({
  deliveries,
  expectedStatus,
  includeOpenButton,
  messageText,
  now,
  service,
  telegramClient,
}: {
  deliveries: AudienceVoteBroadcastDelivery[];
  expectedStatus: AudienceVoteBroadcastStatus;
  includeOpenButton: boolean;
  messageText: string;
  now: Date;
  service: AudienceVoteBroadcastProcessorService;
  telegramClient: AudienceVoteBroadcastTelegramClient;
}): Promise<SendDeliveryBatchResult> {
  let finalFailed = 0;
  let sent = 0;

  for (const delivery of deliveries) {
    const latestBeforeClaim = await service.getAudienceVoteBroadcast(
      delivery.broadcast_id
    );

    if (!canSendBroadcastStatus(latestBeforeClaim?.status, expectedStatus)) {
      return {
        finalFailed,
        interrupted: true,
        sent,
      };
    }

    const claimed = await service.claimAudienceVoteBroadcastDeliveryAttempt({
      deliveryId: delivery.id,
      expectedAttemptCount: delivery.attempt_count,
      lockExpiresAt: new Date(now.getTime() + DELIVERY_ATTEMPT_LOCK_MS),
      now,
    });

    if (!claimed) {
      continue;
    }

    const latestBeforeSend = await service.getAudienceVoteBroadcast(
      claimed.broadcast_id
    );

    if (!canSendBroadcastStatus(latestBeforeSend?.status, expectedStatus)) {
      await service.markAudienceVoteBroadcastDeliverySkipped({
        id: claimed.id,
        now,
        reason: "Broadcast stopped before this delivery was sent.",
      });

      return {
        finalFailed,
        interrupted: true,
        sent,
      };
    }

    try {
      await telegramClient.sendMessage({
        includeOpenButton,
        messageText,
        telegramUserId: claimed.telegram_user_id,
      });
      await service.markAudienceVoteBroadcastDeliverySent(claimed.id, now);
      sent++;
    } catch (error) {
      const blocked = isTelegramBroadcastBlockedError(error);

      if (blocked) {
        await service.deactivateAudienceVoteBroadcastVoter(
          claimed.telegram_user_id
        );
      }

      await service.recordAudienceVoteBroadcastDeliveryFailure({
        deliveryId: claimed.id,
        errorMessage: formatTelegramBroadcastError(error),
        failedAt: now,
        final: true,
        retryAt: now,
      });

      finalFailed++;
    }
  }

  return {
    finalFailed,
    interrupted: false,
    sent,
  };
}

function isTerminalBroadcastStatus(status: AudienceVoteBroadcastStatus) {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "interrupted"
  );
}

function canSendBroadcastStatus(
  status: AudienceVoteBroadcastStatus | undefined,
  expectedStatus: AudienceVoteBroadcastStatus
) {
  return status === expectedStatus;
}

export function isTelegramBroadcastBlockedError(error: unknown) {
  const telegramError = getTelegramErrorLike(error);
  if (!telegramError) return false;

  const description = telegramError.description.toLowerCase();

  return (
    telegramError.error_code === 403 ||
    description.includes("bot was blocked") ||
    description.includes("forbidden") ||
    description.includes("user is deactivated") ||
    description.includes("chat not found")
  );
}

function formatTelegramBroadcastError(error: unknown): string {
  const telegramError = getTelegramErrorLike(error);

  if (telegramError) {
    return `Telegram ${telegramError.error_code}: ${telegramError.description}`;
  }

  return error instanceof Error ? error.message : "Telegram send failed.";
}

function getTelegramErrorLike(
  error: unknown
): { description: string; error_code: number } | undefined {
  if (error instanceof GrammyError) {
    return {
      description: error.description,
      error_code: error.error_code,
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "description" in error &&
    "error_code" in error
  ) {
    const description = error.description;
    const errorCode = error.error_code;

    if (typeof description === "string" && typeof errorCode === "number") {
      return {
        description,
        error_code: errorCode,
      };
    }
  }

  return undefined;
}
