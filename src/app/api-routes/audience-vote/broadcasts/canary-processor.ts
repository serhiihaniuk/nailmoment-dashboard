import { Bot, GrammyError, InlineKeyboard } from "grammy";

import {
  readTelegramAudienceVoteBotToken,
  readTelegramAudienceVoteMiniAppUrl,
} from "@/shared/config/env";
import type { AudienceVoteBroadcastDelivery } from "@/shared/db/schema";
import type {
  AudienceVoteBroadcastSummary,
  AudienceVoteBroadcastStatus,
} from "@/shared/db/service/audience-vote-broadcast-service";
import {
  AUDIENCE_VOTE_BROADCAST_CANARY_WAIT_MS,
  createAudienceVoteBroadcastService,
} from "@/shared/db/service/audience-vote-broadcast-service";

const OPEN_VOTING_BUTTON_TEXT =
  "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u0433\u043e\u043b\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f";

export interface AudienceVoteBroadcastTelegramClient {
  sendMessage: (input: {
    includeOpenButton: boolean;
    messageText: string;
    telegramUserId: number;
  }) => Promise<void>;
}

export interface ProcessAudienceVoteBroadcastCanaryInput {
  broadcastId: string;
  now?: Date;
  service: ReturnType<typeof createAudienceVoteBroadcastService>;
  telegramClient?: AudienceVoteBroadcastTelegramClient;
}

export async function processAudienceVoteBroadcastCanary({
  broadcastId,
  now = new Date(),
  service,
  telegramClient = createTelegramBroadcastClient(),
}: ProcessAudienceVoteBroadcastCanaryInput): Promise<
  AudienceVoteBroadcastSummary | undefined
> {
  const broadcast = await service.getAudienceVoteBroadcast(broadcastId);
  if (!broadcast) return undefined;

  if (
    broadcast.status === "interrupted" ||
    broadcast.status === "ready" ||
    broadcast.status === "failed"
  ) {
    return service.getAudienceVoteBroadcastSummary(broadcastId);
  }

  if (broadcast.next_stage_at > now) {
    return service.getAudienceVoteBroadcastSummary(broadcastId);
  }

  if (broadcast.status === "canary_operator_pending") {
    const deliveries =
      await service.getPendingAudienceVoteBroadcastDeliveries({
        broadcastId,
        limit: 1,
        stage: "operator_canary",
      });
    const result = await sendCanaryDeliveries({
      broadcastStatus: "canary_operator_pending",
      deliveries,
      messageText: broadcast.message_text,
      includeOpenButton: broadcast.include_open_button,
      now,
      service,
      telegramClient,
    });

    if (result.failed > 0) {
      return service.markAudienceVoteBroadcastFailed({ broadcastId, now });
    }

    if (result.interrupted) {
      return service.getAudienceVoteBroadcastSummary(broadcastId);
    }

    return service.markAudienceVoteBroadcastOperatorCanarySent({
      broadcastId,
      nextStageAt: new Date(now.getTime() + AUDIENCE_VOTE_BROADCAST_CANARY_WAIT_MS),
      now,
    });
  }

  if (broadcast.status === "canary_operator_sent") {
    const deliveries =
      await service.getPendingAudienceVoteBroadcastDeliveries({
        broadcastId,
        limit: broadcast.canary_voter_limit + 1,
        stage: "voter_canary",
      });
    const result = await sendCanaryDeliveries({
      broadcastStatus: "canary_operator_sent",
      deliveries,
      messageText: broadcast.message_text,
      includeOpenButton: broadcast.include_open_button,
      now,
      service,
      telegramClient,
    });

    if (result.interrupted) {
      return service.getAudienceVoteBroadcastSummary(broadcastId);
    }

    return service.markAudienceVoteBroadcastVoterCanarySent({
      broadcastId,
      nextStageAt: new Date(now.getTime() + AUDIENCE_VOTE_BROADCAST_CANARY_WAIT_MS),
      now,
    });
  }

  return service.markAudienceVoteBroadcastReady({ broadcastId, now });
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

async function sendCanaryDeliveries({
  broadcastStatus,
  deliveries,
  includeOpenButton,
  messageText,
  now,
  service,
  telegramClient,
}: {
  broadcastStatus: AudienceVoteBroadcastStatus;
  deliveries: AudienceVoteBroadcastDelivery[];
  includeOpenButton: boolean;
  messageText: string;
  now: Date;
  service: ReturnType<typeof createAudienceVoteBroadcastService>;
  telegramClient: AudienceVoteBroadcastTelegramClient;
}): Promise<{ failed: number; interrupted: boolean; sent: number }> {
  let failed = 0;
  let sent = 0;

  for (const delivery of deliveries) {
    const latest = await service.getAudienceVoteBroadcast(delivery.broadcast_id);

    if (!latest || latest.status !== broadcastStatus) {
      return { failed, interrupted: true, sent };
    }

    try {
      await telegramClient.sendMessage({
        includeOpenButton,
        messageText,
        telegramUserId: delivery.telegram_user_id,
      });
      await service.markAudienceVoteBroadcastDeliverySent(delivery.id, now);
      sent++;
    } catch (error) {
      failed++;
      await service.markAudienceVoteBroadcastDeliveryFailed({
        errorMessage: formatTelegramBroadcastError(error),
        id: delivery.id,
        now,
      });
    }
  }

  return { failed, interrupted: false, sent };
}

function formatTelegramBroadcastError(error: unknown): string {
  if (error instanceof GrammyError) {
    return `Telegram ${error.error_code}: ${error.description}`;
  }

  return error instanceof Error ? error.message : "Telegram send failed.";
}
