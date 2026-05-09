import { describe, expect, test } from "vitest";

import type {
  AudienceVoteBroadcast,
  AudienceVoteBroadcastDelivery,
} from "@/shared/db/schema";
import type {
  AudienceVoteBroadcastDeliveryCountsByStage,
  AudienceVoteBroadcastDeliveryStatus,
  AudienceVoteBroadcastStatus,
  AudienceVoteBroadcastSummary,
} from "@/shared/db/service/audience-vote-broadcast-service";
import { buildAudienceVoteBroadcastDeliveryRows } from "@/shared/db/service/audience-vote-broadcast-service";
import {
  isTelegramBroadcastBlockedError,
  processAudienceVoteBroadcast,
  processDueAudienceVoteBroadcasts,
  type AudienceVoteBroadcastProcessorService,
  type AudienceVoteBroadcastTelegramClient,
} from "./broadcast-processor";

const now = new Date("2026-05-08T16:00:00.000Z");

describe("Audience Vote Broadcast processor", () => {
  test("builds canary deliveries without sending canary voters again in normal delivery", () => {
    const rows = buildAudienceVoteBroadcastDeliveryRows({
      activeTelegramUserIds: [299445418, 111, 222, 333],
      broadcastId: "broadcast_1",
      canaryVoterLimit: 2,
      nextAttemptAt: now,
      operatorTelegramUserIds: [299445418],
    });

    expect(
      rows.map((row) => ({
        stage: row.stage,
        telegramUserId: row.telegram_user_id,
      }))
    ).toEqual([
      { stage: "operator_canary", telegramUserId: 299445418 },
      { stage: "voter_canary", telegramUserId: 299445418 },
      { stage: "voter_canary", telegramUserId: 111 },
      { stage: "voter_canary", telegramUserId: 222 },
      { stage: "normal", telegramUserId: 333 },
    ]);
  });

  test("builds canary deliveries for multiple Operators and excludes them from normal delivery", () => {
    const rows = buildAudienceVoteBroadcastDeliveryRows({
      activeTelegramUserIds: [299445418, 400, 111, 222, 333],
      broadcastId: "broadcast_1",
      canaryVoterLimit: 2,
      nextAttemptAt: now,
      operatorTelegramUserIds: [299445418, 400],
    });

    expect(
      rows.map((row) => ({
        stage: row.stage,
        telegramUserId: row.telegram_user_id,
      }))
    ).toEqual([
      { stage: "operator_canary", telegramUserId: 299445418 },
      { stage: "operator_canary", telegramUserId: 400 },
      { stage: "voter_canary", telegramUserId: 299445418 },
      { stage: "voter_canary", telegramUserId: 400 },
      { stage: "voter_canary", telegramUserId: 111 },
      { stage: "voter_canary", telegramUserId: 222 },
      { stage: "normal", telegramUserId: 333 },
    ]);
  });

  test("marks a failed Operator canary final after one ambiguous send attempt", async () => {
    const service = new FakeBroadcastService({
      broadcasts: [makeBroadcast({ status: "canary_operator_pending" })],
      deliveries: [makeDelivery({ stage: "operator_canary" })],
    });
    const telegramClient = createTelegramClient({
      failFor: new Map([[299445418, new Error("temporary Telegram outage")]]),
    });

    const result = await processAudienceVoteBroadcast({
      broadcastId: "broadcast_1",
      now,
      service,
      telegramClient,
    });

    expect(result?.status).toBe("failed");
    expect(service.getDelivery("delivery_1")).toMatchObject({
      attempt_count: 1,
      last_error: "temporary Telegram outage",
      status: "failed",
    });
    expect(service.getDelivery("delivery_1")?.next_attempt_at).toEqual(now);
  });

  test("does not resend an already attempted failed Operator canary", async () => {
    const service = new FakeBroadcastService({
      broadcasts: [makeBroadcast({ status: "canary_operator_pending" })],
      deliveries: [
        makeDelivery({
          attempt_count: 1,
          stage: "operator_canary",
          status: "failed",
        }),
      ],
    });
    const telegramClient = createTelegramClient();

    const result = await processAudienceVoteBroadcast({
      broadcastId: "broadcast_1",
      now,
      service,
      telegramClient,
    });

    expect(result?.status).toBe("failed");
    expect(telegramClient.sentTo).toEqual([]);
    expect(service.getDelivery("delivery_1")).toMatchObject({
      attempt_count: 1,
      status: "failed",
    });
  });

  test("marks blocked voters inactive and completes the remaining normal batch", async () => {
    const service = new FakeBroadcastService({
      broadcasts: [makeBroadcast({ status: "ready" })],
      deliveries: [
        makeDelivery({
          id: "blocked_delivery",
          stage: "normal",
          telegram_user_id: 111,
        }),
        makeDelivery({
          id: "sent_delivery",
          stage: "normal",
          telegram_user_id: 222,
        }),
      ],
    });
    const telegramClient = createTelegramClient({
      failFor: new Map([
        [
          111,
          {
            description: "Forbidden: bot was blocked by the user",
            error_code: 403,
          },
        ],
      ]),
    });

    const result = await processAudienceVoteBroadcast({
      broadcastId: "broadcast_1",
      now,
      service,
      telegramClient,
    });

    expect(result?.status).toBe("completed");
    expect(service.deactivatedTelegramUserIds).toEqual([111]);
    expect(service.getDelivery("blocked_delivery")).toMatchObject({
      attempt_count: 1,
      status: "failed",
    });
    expect(service.getDelivery("sent_delivery")).toMatchObject({
      attempt_count: 1,
      status: "sent",
    });
  });

  test("checks the DB kill switch before every recipient send", async () => {
    const service = new FakeBroadcastService({
      broadcasts: [makeBroadcast({ status: "ready" })],
      deliveries: [
        makeDelivery({
          id: "first_delivery",
          stage: "normal",
          telegram_user_id: 111,
        }),
        makeDelivery({
          id: "second_delivery",
          stage: "normal",
          telegram_user_id: 222,
        }),
      ],
    });
    const sentTo: number[] = [];
    const telegramClient: AudienceVoteBroadcastTelegramClient = {
      async sendMessage({ telegramUserId }) {
        sentTo.push(telegramUserId);

        if (telegramUserId === 111) {
          service.setBroadcastStatus("broadcast_1", "interrupted");
        }
      },
    };

    const result = await processAudienceVoteBroadcast({
      broadcastId: "broadcast_1",
      now,
      service,
      telegramClient,
    });

    expect(result?.status).toBe("interrupted");
    expect(sentTo).toEqual([111]);
    expect(service.getDelivery("first_delivery")?.status).toBe("sent");
    expect(service.getDelivery("second_delivery")?.status).toBe("pending");
  });

  test("does not overwrite an interrupt that lands before completion", async () => {
    const service = new FakeBroadcastService({
      broadcasts: [makeBroadcast({ status: "ready" })],
      deliveries: [makeDelivery({ stage: "normal", telegram_user_id: 111 })],
    });
    service.interruptAfterNextHasAttemptableCheck = true;
    const telegramClient = createTelegramClient();

    const result = await processAudienceVoteBroadcast({
      broadcastId: "broadcast_1",
      now,
      service,
      telegramClient,
    });

    expect(result?.status).toBe("interrupted");
    expect(telegramClient.sentTo).toEqual([111]);
    expect(service.getDelivery("delivery_1")?.status).toBe("sent");
  });

  test("scheduled processing uses the same safe path for due broadcasts", async () => {
    const service = new FakeBroadcastService({
      broadcasts: [makeBroadcast({ status: "ready" })],
      deliveries: [makeDelivery({ stage: "normal" })],
    });
    const telegramClient = createTelegramClient();

    const result = await processDueAudienceVoteBroadcasts({
      now,
      service,
      telegramClient,
    });

    expect(result.processed).toHaveLength(1);
    expect(result.processed[0]?.status).toBe("completed");
    expect(telegramClient.sentTo).toEqual([299445418]);
  });

  test("detects Telegram block-style errors", () => {
    expect(
      isTelegramBroadcastBlockedError({
        description: "Forbidden: bot was blocked by the user",
        error_code: 403,
      })
    ).toBe(true);
    expect(isTelegramBroadcastBlockedError(new Error("ECONNRESET"))).toBe(
      false
    );
  });
});

class FakeBroadcastService implements AudienceVoteBroadcastProcessorService {
  readonly deactivatedTelegramUserIds: number[] = [];
  interruptAfterNextHasAttemptableCheck = false;
  private readonly broadcasts = new Map<string, AudienceVoteBroadcast>();
  private readonly deliveries = new Map<string, AudienceVoteBroadcastDelivery>();

  constructor({
    broadcasts,
    deliveries,
  }: {
    broadcasts: AudienceVoteBroadcast[];
    deliveries: AudienceVoteBroadcastDelivery[];
  }) {
    for (const broadcast of broadcasts) {
      this.broadcasts.set(broadcast.id, broadcast);
    }

    for (const delivery of deliveries) {
      this.deliveries.set(delivery.id, delivery);
    }
  }

  getDelivery(id: string) {
    return this.deliveries.get(id);
  }

  setBroadcastStatus(id: string, status: AudienceVoteBroadcastStatus) {
    const broadcast = this.broadcasts.get(id);
    if (!broadcast) return;

    this.broadcasts.set(id, {
      ...broadcast,
      interrupted_at: status === "interrupted" ? now : broadcast.interrupted_at,
      status,
      updated_at: now,
    });
  }

  async claimAudienceVoteBroadcastDeliveryAttempt({
    deliveryId,
    expectedAttemptCount,
    lockExpiresAt,
    maxAttempts = 1,
    now: claimNow = now,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["claimAudienceVoteBroadcastDeliveryAttempt"]
  >[0]) {
    const delivery = this.deliveries.get(deliveryId);

    if (
      !delivery ||
      delivery.status !== "pending" ||
      delivery.attempt_count !== expectedAttemptCount ||
      delivery.attempt_count >= maxAttempts ||
      delivery.next_attempt_at > claimNow
    ) {
      return undefined;
    }

    const claimed = {
      ...delivery,
      attempt_count: delivery.attempt_count + 1,
      last_error:
        "Delivery attempt was claimed but no successful Telegram handoff was recorded.",
      next_attempt_at: lockExpiresAt,
      status: "failed",
      updated_at: claimNow,
    } satisfies AudienceVoteBroadcastDelivery;

    this.deliveries.set(claimed.id, claimed);
    return claimed;
  }

  async deactivateAudienceVoteBroadcastVoter(telegramUserId: number) {
    this.deactivatedTelegramUserIds.push(telegramUserId);
  }

  async getAudienceVoteBroadcast(id: string) {
    return this.broadcasts.get(id);
  }

  async getAudienceVoteBroadcastSummary(id: string) {
    return this.buildSummary(id);
  }

  async getDueAudienceVoteBroadcastDeliveries({
    broadcastId,
    limit,
    maxAttempts = 1,
    now: dueNow = now,
    stage,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["getDueAudienceVoteBroadcastDeliveries"]
  >[0]) {
    return [...this.deliveries.values()]
      .filter(
        (delivery) =>
          delivery.broadcast_id === broadcastId &&
          delivery.stage === stage &&
          delivery.status === "pending" &&
          delivery.attempt_count < maxAttempts &&
          delivery.next_attempt_at <= dueNow
      )
      .sort(
        (first, second) =>
          first.next_attempt_at.getTime() - second.next_attempt_at.getTime() ||
          first.created_at.getTime() - second.created_at.getTime()
      )
      .slice(0, limit);
  }

  async getProcessableAudienceVoteBroadcasts({
    limit,
    maxAttempts = 1,
    now: dueNow = now,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["getProcessableAudienceVoteBroadcasts"]
  >[0]) {
    return [...this.broadcasts.values()]
      .filter((broadcast) => {
        if (
          broadcast.status === "canary_operator_pending" ||
          broadcast.status === "canary_operator_sent" ||
          broadcast.status === "canary_voters_sent"
        ) {
          return broadcast.next_stage_at <= dueNow;
        }

        if (broadcast.status !== "ready") {
          return false;
        }

        return [...this.deliveries.values()].some(
          (delivery) =>
            delivery.broadcast_id === broadcast.id &&
            delivery.stage === "normal" &&
            delivery.status === "pending" &&
            delivery.attempt_count < maxAttempts &&
            delivery.next_attempt_at <= dueNow
        );
      })
      .slice(0, limit);
  }

  async hasAttemptableAudienceVoteBroadcastDeliveries({
    broadcastId,
    maxAttempts = 1,
    stage,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["hasAttemptableAudienceVoteBroadcastDeliveries"]
  >[0]) {
    const hasAttemptable = [...this.deliveries.values()].some(
      (delivery) =>
        delivery.broadcast_id === broadcastId &&
        delivery.stage === stage &&
        delivery.status === "pending" &&
        delivery.attempt_count < maxAttempts
    );

    if (this.interruptAfterNextHasAttemptableCheck) {
      this.interruptAfterNextHasAttemptableCheck = false;
      this.setBroadcastStatus(broadcastId, "interrupted");
    }

    return hasAttemptable;
  }

  async markAudienceVoteBroadcastCompleted({
    broadcastId,
    now: completedAt = now,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["markAudienceVoteBroadcastCompleted"]
  >[0]) {
    return this.updateBroadcastStatus({
      expectedStatus: "ready",
      id: broadcastId,
      status: "completed",
      updatedAt: completedAt,
    });
  }

  async markAudienceVoteBroadcastDeliverySent(id: string, sentAt = now) {
    const delivery = this.deliveries.get(id);
    if (!delivery) return;

    this.deliveries.set(id, {
      ...delivery,
      last_error: null,
      next_attempt_at: sentAt,
      sent_at: sentAt,
      status: "sent",
      updated_at: sentAt,
    });
  }

  async markAudienceVoteBroadcastDeliverySkipped({
    id,
    now: skippedAt = now,
    reason,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["markAudienceVoteBroadcastDeliverySkipped"]
  >[0]) {
    const delivery = this.deliveries.get(id);
    if (!delivery) return;

    this.deliveries.set(id, {
      ...delivery,
      last_error: reason,
      next_attempt_at: skippedAt,
      status: "skipped",
      updated_at: skippedAt,
    });
  }

  async markAudienceVoteBroadcastFailed({
    broadcastId,
    now: failedAt = now,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["markAudienceVoteBroadcastFailed"]
  >[0]) {
    return this.updateBroadcastStatus({
      id: broadcastId,
      status: "failed",
      updatedAt: failedAt,
    });
  }

  async markAudienceVoteBroadcastOperatorCanarySent({
    broadcastId,
    nextStageAt,
    now: sentAt = now,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["markAudienceVoteBroadcastOperatorCanarySent"]
  >[0]) {
    return this.updateBroadcastStatus({
      expectedStatus: "canary_operator_pending",
      id: broadcastId,
      nextStageAt,
      status: "canary_operator_sent",
      updatedAt: sentAt,
    });
  }

  async markAudienceVoteBroadcastReady({
    broadcastId,
    now: readyAt = now,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["markAudienceVoteBroadcastReady"]
  >[0]) {
    return this.updateBroadcastStatus({
      expectedStatus: "canary_voters_sent",
      id: broadcastId,
      status: "ready",
      updatedAt: readyAt,
    });
  }

  async markAudienceVoteBroadcastVoterCanarySent({
    broadcastId,
    nextStageAt,
    now: sentAt = now,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["markAudienceVoteBroadcastVoterCanarySent"]
  >[0]) {
    return this.updateBroadcastStatus({
      expectedStatus: "canary_operator_sent",
      id: broadcastId,
      nextStageAt,
      status: "canary_voters_sent",
      updatedAt: sentAt,
    });
  }

  async recordAudienceVoteBroadcastDeliveryFailure({
    deliveryId,
    errorMessage,
    failedAt = now,
    final,
    retryAt,
  }: Parameters<
    AudienceVoteBroadcastProcessorService["recordAudienceVoteBroadcastDeliveryFailure"]
  >[0]) {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return;

    this.deliveries.set(deliveryId, {
      ...delivery,
      last_error: errorMessage,
      next_attempt_at: retryAt,
      status: final ? "failed" : "pending",
      updated_at: failedAt,
    });
  }

  private async updateBroadcastStatus({
    expectedStatus,
    id,
    nextStageAt,
    status,
    updatedAt,
  }: {
    expectedStatus?: AudienceVoteBroadcastStatus;
    id: string;
    nextStageAt?: Date;
    status: AudienceVoteBroadcastStatus;
    updatedAt: Date;
  }) {
    const broadcast = this.broadcasts.get(id);
    if (!broadcast) return undefined;

    if (expectedStatus && broadcast.status !== expectedStatus) {
      return this.buildSummary(id);
    }

    const updated = {
      ...broadcast,
      interrupted_at:
        status === "interrupted" ? updatedAt : broadcast.interrupted_at,
      next_stage_at: nextStageAt ?? updatedAt,
      status,
      updated_at: updatedAt,
    } satisfies AudienceVoteBroadcast;

    this.broadcasts.set(id, updated);
    return this.buildSummary(id);
  }

  private buildSummary(id: string) {
    const broadcast = this.broadcasts.get(id);
    if (!broadcast) return undefined;

    const delivery_counts = createEmptyDeliveryCounts();

    for (const delivery of this.deliveries.values()) {
      if (delivery.broadcast_id === id) {
        delivery_counts[delivery.stage][delivery.status] += 1;
      }
    }

    return {
      ...broadcast,
      delivery_counts,
    } satisfies AudienceVoteBroadcastSummary;
  }
}

function createTelegramClient({
  failFor = new Map<number, unknown>(),
}: {
  failFor?: Map<number, unknown>;
} = {}) {
  const sentTo: number[] = [];
  const client: AudienceVoteBroadcastTelegramClient & { sentTo: number[] } = {
    sentTo,
    async sendMessage({ telegramUserId }) {
      const failure = failFor.get(telegramUserId);

      if (failure) {
        throw failure;
      }

      sentTo.push(telegramUserId);
    },
  };

  return client;
}

function makeBroadcast(
  overrides: Partial<AudienceVoteBroadcast> = {}
): AudienceVoteBroadcast {
  return {
    audience_vote_id: "vote_1",
    canary_voter_limit: 25,
    created_at: now,
    estimated_recipient_count: 1,
    id: "broadcast_1",
    include_open_button: true,
    interrupted_at: null,
    message_text: "Public voting starts now",
    next_stage_at: now,
    operator_telegram_user_id: 299445418,
    status: "ready",
    updated_at: now,
    ...overrides,
  };
}

function makeDelivery(
  overrides: Partial<AudienceVoteBroadcastDelivery> = {}
): AudienceVoteBroadcastDelivery {
  return {
    attempt_count: 0,
    broadcast_id: "broadcast_1",
    created_at: now,
    id: "delivery_1",
    last_error: null,
    next_attempt_at: now,
    sent_at: null,
    stage: "normal",
    status: "pending",
    telegram_user_id: 299445418,
    updated_at: now,
    ...overrides,
  };
}

function createEmptyDeliveryCounts(): AudienceVoteBroadcastDeliveryCountsByStage {
  return {
    normal: createEmptyDeliveryStatusCounts(),
    operator_canary: createEmptyDeliveryStatusCounts(),
    voter_canary: createEmptyDeliveryStatusCounts(),
  };
}

function createEmptyDeliveryStatusCounts() {
  const counts: Record<AudienceVoteBroadcastDeliveryStatus, number> = {
    failed: 0,
    pending: 0,
    sent: 0,
    skipped: 0,
  };

  return counts;
}
