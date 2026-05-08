import { and, asc, count, desc, eq, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import type { DrizzleDB } from "@/shared/db";
import {
  audienceVoteBroadcastDeliveryTable,
  audienceVoteBroadcastTable,
  audienceVoteTable,
  telegramUsersTable,
  type AudienceVoteBroadcast,
  type AudienceVoteBroadcastDelivery,
  type InsertAudienceVoteBroadcast,
  type InsertAudienceVoteBroadcastDelivery,
} from "@/shared/db/schema";
import {
  insertAudienceVoteBroadcastDeliverySchema,
  insertAudienceVoteBroadcastSchema,
  type CreateAudienceVoteBroadcastClientOutput,
} from "@/shared/db/schema.zod";

export const AUDIENCE_VOTE_BROADCAST_CANARY_VOTER_LIMIT = 25;
export const AUDIENCE_VOTE_BROADCAST_CANARY_WAIT_MS = 2 * 60 * 1000;
export const AUDIENCE_VOTE_BROADCAST_DELIVERY_BATCH_LIMIT = 25;
export const AUDIENCE_VOTE_BROADCAST_MAX_DELIVERY_ATTEMPTS = 1;

export type AudienceVoteBroadcastStatus = AudienceVoteBroadcast["status"];
export type AudienceVoteBroadcastDeliveryStage =
  AudienceVoteBroadcastDelivery["stage"];
export type AudienceVoteBroadcastDeliveryStatus =
  AudienceVoteBroadcastDelivery["status"];

export type AudienceVoteBroadcastDeliveryCounts = Record<
  AudienceVoteBroadcastDeliveryStatus,
  number
>;

export type AudienceVoteBroadcastDeliveryCountsByStage = Record<
  AudienceVoteBroadcastDeliveryStage,
  AudienceVoteBroadcastDeliveryCounts
>;

export type AudienceVoteBroadcastSummary = AudienceVoteBroadcast & {
  delivery_counts: AudienceVoteBroadcastDeliveryCountsByStage;
};

export interface CreateAudienceVoteBroadcastInput
  extends CreateAudienceVoteBroadcastClientOutput {
  operatorTelegramUserId: number;
  now?: Date;
}

export interface GetDueAudienceVoteBroadcastDeliveriesInput {
  broadcastId: string;
  limit: number;
  maxAttempts?: number;
  now?: Date;
  stage: AudienceVoteBroadcastDeliveryStage;
}

export interface HasAttemptableAudienceVoteBroadcastDeliveriesInput {
  broadcastId: string;
  maxAttempts?: number;
  stage: AudienceVoteBroadcastDeliveryStage;
}

export interface GetProcessableAudienceVoteBroadcastsInput {
  limit: number;
  maxAttempts?: number;
  now?: Date;
}

export interface ClaimAudienceVoteBroadcastDeliveryAttemptInput {
  deliveryId: string;
  expectedAttemptCount: number;
  lockExpiresAt: Date;
  maxAttempts?: number;
  now?: Date;
}

export interface RecordAudienceVoteBroadcastDeliveryFailureInput {
  deliveryId: string;
  errorMessage: string;
  failedAt?: Date;
  final: boolean;
  retryAt: Date;
}

export class AudienceVoteBroadcastInterruptError extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "AudienceVoteBroadcastInterruptError";
  }
}

const processableCanaryStatuses = [
  "canary_operator_pending",
  "canary_operator_sent",
  "canary_voters_sent",
] satisfies AudienceVoteBroadcastStatus[];
const interruptibleBroadcastStatuses: readonly AudienceVoteBroadcastStatus[] = [
  "canary_operator_pending",
  "canary_operator_sent",
  "canary_voters_sent",
  "ready",
];

export function createAudienceVoteBroadcastService(db: DrizzleDB) {
  const getActiveBroadcastTargetVoterCount = async (
    operatorTelegramUserId: number
  ): Promise<number> => {
    const [result] = await db
      .select({ total: count(telegramUsersTable.telegramUserId) })
      .from(telegramUsersTable)
      .where(activeBroadcastTargetWhere(operatorTelegramUserId));

    return result?.total ?? 0;
  };

  const getAudienceVoteBroadcast = async (
    id: string
  ): Promise<AudienceVoteBroadcast | undefined> => {
    const [broadcast] = await db
      .select()
      .from(audienceVoteBroadcastTable)
      .where(eq(audienceVoteBroadcastTable.id, id))
      .limit(1);

    return broadcast;
  };

  const getAudienceVoteBroadcastSummary = async (
    id: string
  ): Promise<AudienceVoteBroadcastSummary | undefined> => {
    const broadcast = await getAudienceVoteBroadcast(id);
    if (!broadcast) return undefined;

    const summaries = await attachDeliveryCounts([broadcast]);
    return summaries[0];
  };

  const getAudienceVoteBroadcastSummaries = async (): Promise<
    AudienceVoteBroadcastSummary[]
  > => {
    const broadcasts = await db
      .select()
      .from(audienceVoteBroadcastTable)
      .orderBy(desc(audienceVoteBroadcastTable.created_at));

    return attachDeliveryCounts(broadcasts);
  };

  const getProcessableAudienceVoteBroadcasts = async ({
    limit,
    maxAttempts = AUDIENCE_VOTE_BROADCAST_MAX_DELIVERY_ATTEMPTS,
    now = new Date(),
  }: GetProcessableAudienceVoteBroadcastsInput): Promise<
    AudienceVoteBroadcast[]
  > => {
    const dueCanaryBroadcasts = await db
      .select()
      .from(audienceVoteBroadcastTable)
      .where(
        and(
          inArray(audienceVoteBroadcastTable.status, processableCanaryStatuses),
          lte(audienceVoteBroadcastTable.next_stage_at, now)
        )
      )
      .orderBy(
        asc(audienceVoteBroadcastTable.next_stage_at),
        asc(audienceVoteBroadcastTable.created_at)
      )
      .limit(limit);

    const remainingLimit = limit - dueCanaryBroadcasts.length;
    if (remainingLimit <= 0) {
      return dueCanaryBroadcasts;
    }

    const dueNormalBroadcasts = await db
      .select()
      .from(audienceVoteBroadcastTable)
      .where(
        and(
          eq(audienceVoteBroadcastTable.status, "ready"),
          sql`exists (
            select 1
            from ${audienceVoteBroadcastDeliveryTable}
            where ${audienceVoteBroadcastDeliveryTable.broadcast_id} = ${audienceVoteBroadcastTable.id}
              and ${audienceVoteBroadcastDeliveryTable.stage} = 'normal'
              and ${audienceVoteBroadcastDeliveryTable.status} = 'pending'
              and ${audienceVoteBroadcastDeliveryTable.attempt_count} < ${maxAttempts}
              and ${audienceVoteBroadcastDeliveryTable.next_attempt_at} <= ${now}
          )`
        )
      )
      .orderBy(
        asc(audienceVoteBroadcastTable.next_stage_at),
        asc(audienceVoteBroadcastTable.created_at)
      )
      .limit(remainingLimit);

    return [...dueCanaryBroadcasts, ...dueNormalBroadcasts];
  };

  const createAudienceVoteBroadcast = async ({
    audience_vote_id,
    include_open_button,
    message_text,
    now = new Date(),
    operatorTelegramUserId,
  }: CreateAudienceVoteBroadcastInput): Promise<
    AudienceVoteBroadcastSummary | undefined
  > => {
    const [vote] = await db
      .select({ id: audienceVoteTable.id })
      .from(audienceVoteTable)
      .where(
        and(
          eq(audienceVoteTable.id, audience_vote_id),
          eq(audienceVoteTable.archived, false)
        )
      )
      .limit(1);

    if (!vote) {
      return undefined;
    }

    const activeVoters = await getActiveBroadcastTargetVoters(
      operatorTelegramUserId
    );
    const canaryVoters = activeVoters.slice(
      0,
      AUDIENCE_VOTE_BROADCAST_CANARY_VOTER_LIMIT
    );
    const broadcastId = nanoid(12);
    const broadcastData = insertAudienceVoteBroadcastSchema.parse({
      audience_vote_id,
      canary_voter_limit: AUDIENCE_VOTE_BROADCAST_CANARY_VOTER_LIMIT,
      estimated_recipient_count: activeVoters.length,
      id: broadcastId,
      include_open_button,
      message_text,
      next_stage_at: now,
      operator_telegram_user_id: operatorTelegramUserId,
      status: "canary_operator_pending",
    } satisfies InsertAudienceVoteBroadcast);

    const [broadcast] = await db
      .insert(audienceVoteBroadcastTable)
      .values(broadcastData)
      .returning();

    if (!broadcast) {
      throw new Error(
        "Audience Vote Broadcast insertion failed to return the record."
      );
    }

    await insertDeliveryRows(
      buildAudienceVoteBroadcastDeliveryRows({
        activeTelegramUserIds: activeVoters.map((voter) => voter.telegramUserId),
        broadcastId,
        canaryVoterLimit: canaryVoters.length,
        nextAttemptAt: now,
        operatorTelegramUserId,
      })
    );

    const summary = await getAudienceVoteBroadcastSummary(broadcast.id);
    if (!summary) {
      throw new Error("Audience Vote Broadcast insertion failed to reload.");
    }

    return summary;
  };

  const getDueAudienceVoteBroadcastDeliveries = async ({
    broadcastId,
    limit,
    maxAttempts = AUDIENCE_VOTE_BROADCAST_MAX_DELIVERY_ATTEMPTS,
    now = new Date(),
    stage,
  }: GetDueAudienceVoteBroadcastDeliveriesInput): Promise<
    AudienceVoteBroadcastDelivery[]
  > => {
    return db
      .select()
      .from(audienceVoteBroadcastDeliveryTable)
      .where(
        and(
          eq(audienceVoteBroadcastDeliveryTable.broadcast_id, broadcastId),
          eq(audienceVoteBroadcastDeliveryTable.stage, stage),
          eq(audienceVoteBroadcastDeliveryTable.status, "pending"),
          lt(audienceVoteBroadcastDeliveryTable.attempt_count, maxAttempts),
          lte(audienceVoteBroadcastDeliveryTable.next_attempt_at, now)
        )
      )
      .orderBy(
        asc(audienceVoteBroadcastDeliveryTable.next_attempt_at),
        asc(audienceVoteBroadcastDeliveryTable.created_at)
      )
      .limit(limit);
  };

  const hasAttemptableAudienceVoteBroadcastDeliveries = async ({
    broadcastId,
    maxAttempts = AUDIENCE_VOTE_BROADCAST_MAX_DELIVERY_ATTEMPTS,
    stage,
  }: HasAttemptableAudienceVoteBroadcastDeliveriesInput): Promise<boolean> => {
    const [result] = await db
      .select({ total: count(audienceVoteBroadcastDeliveryTable.id) })
      .from(audienceVoteBroadcastDeliveryTable)
      .where(
        and(
          eq(audienceVoteBroadcastDeliveryTable.broadcast_id, broadcastId),
          eq(audienceVoteBroadcastDeliveryTable.stage, stage),
          eq(audienceVoteBroadcastDeliveryTable.status, "pending"),
          lt(audienceVoteBroadcastDeliveryTable.attempt_count, maxAttempts)
        )
      );

    return (result?.total ?? 0) > 0;
  };

  const claimAudienceVoteBroadcastDeliveryAttempt = async ({
    deliveryId,
    expectedAttemptCount,
    lockExpiresAt,
    maxAttempts = AUDIENCE_VOTE_BROADCAST_MAX_DELIVERY_ATTEMPTS,
    now = new Date(),
  }: ClaimAudienceVoteBroadcastDeliveryAttemptInput): Promise<
    AudienceVoteBroadcastDelivery | undefined
  > => {
    const [delivery] = await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        attempt_count: sql`${audienceVoteBroadcastDeliveryTable.attempt_count} + 1`,
        last_error:
          "Delivery attempt was claimed but no successful Telegram handoff was recorded.",
        next_attempt_at: lockExpiresAt,
        status: "failed",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastDeliveryTable.id, deliveryId),
          eq(audienceVoteBroadcastDeliveryTable.status, "pending"),
          eq(
            audienceVoteBroadcastDeliveryTable.attempt_count,
            expectedAttemptCount
          ),
          lt(audienceVoteBroadcastDeliveryTable.attempt_count, maxAttempts),
          lte(audienceVoteBroadcastDeliveryTable.next_attempt_at, now)
        )
      )
      .returning();

    return delivery;
  };

  const markAudienceVoteBroadcastDeliverySent = async (
    id: string,
    sentAt = new Date()
  ): Promise<void> => {
    await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        last_error: null,
        next_attempt_at: sentAt,
        sent_at: sentAt,
        status: "sent",
        updated_at: sentAt,
      })
      .where(eq(audienceVoteBroadcastDeliveryTable.id, id));
  };

  const recordAudienceVoteBroadcastDeliveryFailure = async ({
    deliveryId,
    errorMessage,
    failedAt = new Date(),
    final,
    retryAt,
  }: RecordAudienceVoteBroadcastDeliveryFailureInput): Promise<void> => {
    await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        last_error: errorMessage.slice(0, 1000),
        next_attempt_at: retryAt,
        status: final ? "failed" : "pending",
        updated_at: failedAt,
      })
      .where(eq(audienceVoteBroadcastDeliveryTable.id, deliveryId));
  };

  const markAudienceVoteBroadcastDeliverySkipped = async ({
    id,
    now = new Date(),
    reason,
  }: {
    id: string;
    now?: Date;
    reason: string;
  }): Promise<void> => {
    await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        last_error: reason.slice(0, 1000),
        next_attempt_at: now,
        status: "skipped",
        updated_at: now,
      })
      .where(eq(audienceVoteBroadcastDeliveryTable.id, id));
  };

  const markAudienceVoteBroadcastOperatorCanarySent = async ({
    broadcastId,
    nextStageAt,
    now = new Date(),
  }: {
    broadcastId: string;
    nextStageAt: Date;
    now?: Date;
  }): Promise<AudienceVoteBroadcastSummary | undefined> => {
    await db
      .update(audienceVoteBroadcastTable)
      .set({
        next_stage_at: nextStageAt,
        status: "canary_operator_sent",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastTable.id, broadcastId),
          eq(audienceVoteBroadcastTable.status, "canary_operator_pending")
        )
      );

    return getAudienceVoteBroadcastSummary(broadcastId);
  };

  const markAudienceVoteBroadcastVoterCanarySent = async ({
    broadcastId,
    nextStageAt,
    now = new Date(),
  }: {
    broadcastId: string;
    nextStageAt: Date;
    now?: Date;
  }): Promise<AudienceVoteBroadcastSummary | undefined> => {
    await db
      .update(audienceVoteBroadcastTable)
      .set({
        next_stage_at: nextStageAt,
        status: "canary_voters_sent",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastTable.id, broadcastId),
          eq(audienceVoteBroadcastTable.status, "canary_operator_sent")
        )
      );

    return getAudienceVoteBroadcastSummary(broadcastId);
  };

  const markAudienceVoteBroadcastReady = async ({
    broadcastId,
    now = new Date(),
  }: {
    broadcastId: string;
    now?: Date;
  }): Promise<AudienceVoteBroadcastSummary | undefined> => {
    await db
      .update(audienceVoteBroadcastTable)
      .set({
        next_stage_at: now,
        status: "ready",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastTable.id, broadcastId),
          eq(audienceVoteBroadcastTable.status, "canary_voters_sent")
        )
      );

    return getAudienceVoteBroadcastSummary(broadcastId);
  };

  const markAudienceVoteBroadcastCompleted = async ({
    broadcastId,
    now = new Date(),
  }: {
    broadcastId: string;
    now?: Date;
  }): Promise<AudienceVoteBroadcastSummary | undefined> => {
    await db
      .update(audienceVoteBroadcastTable)
      .set({
        next_stage_at: now,
        status: "completed",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastTable.id, broadcastId),
          eq(audienceVoteBroadcastTable.status, "ready")
        )
      );

    return getAudienceVoteBroadcastSummary(broadcastId);
  };

  const markAudienceVoteBroadcastFailed = async ({
    broadcastId,
    now = new Date(),
  }: {
    broadcastId: string;
    now?: Date;
  }): Promise<AudienceVoteBroadcastSummary | undefined> => {
    await db
      .update(audienceVoteBroadcastTable)
      .set({
        status: "failed",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastTable.id, broadcastId),
          inArray(audienceVoteBroadcastTable.status, interruptibleBroadcastStatuses)
        )
      );

    return getAudienceVoteBroadcastSummary(broadcastId);
  };

  const deactivateAudienceVoteBroadcastVoter = async (
    telegramUserId: number
  ): Promise<void> => {
    await db
      .update(telegramUsersTable)
      .set({ isActive: false })
      .where(eq(telegramUsersTable.telegramUserId, telegramUserId));
  };

  const interruptAudienceVoteBroadcast = async ({
    broadcastId,
    now = new Date(),
  }: {
    broadcastId: string;
    now?: Date;
  }): Promise<AudienceVoteBroadcastSummary | undefined> => {
    const broadcast = await getAudienceVoteBroadcast(broadcastId);
    if (!broadcast) return undefined;

    if (!isAudienceVoteBroadcastInterruptible(broadcast.status)) {
      throw new AudienceVoteBroadcastInterruptError(
        "Only an active Audience Vote Broadcast can be interrupted."
      );
    }

    const [interrupted] = await db
      .update(audienceVoteBroadcastTable)
      .set({
        interrupted_at: now,
        status: "interrupted",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastTable.id, broadcastId),
          inArray(audienceVoteBroadcastTable.status, interruptibleBroadcastStatuses)
        )
      )
      .returning({ id: audienceVoteBroadcastTable.id });

    if (!interrupted) {
      const latestBroadcast = await getAudienceVoteBroadcast(broadcastId);
      if (!latestBroadcast) return undefined;

      if (!isAudienceVoteBroadcastInterruptible(latestBroadcast.status)) {
        throw new AudienceVoteBroadcastInterruptError(
          "Only an active Audience Vote Broadcast can be interrupted."
        );
      }
    }

    await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        last_error: "Interrupted by Operator.",
        next_attempt_at: now,
        status: "skipped",
        updated_at: now,
      })
      .where(
        and(
          eq(audienceVoteBroadcastDeliveryTable.broadcast_id, broadcastId),
          eq(audienceVoteBroadcastDeliveryTable.status, "pending")
        )
      );

    return getAudienceVoteBroadcastSummary(broadcastId);
  };

  async function getActiveBroadcastTargetVoters(operatorTelegramUserId: number) {
    return db
      .select({ telegramUserId: telegramUsersTable.telegramUserId })
      .from(telegramUsersTable)
      .where(activeBroadcastTargetWhere(operatorTelegramUserId))
      .orderBy(
        asc(telegramUsersTable.createdAt),
        asc(telegramUsersTable.telegramUserId)
      );
  }

  async function insertDeliveryRows(
    rows: InsertAudienceVoteBroadcastDelivery[]
  ) {
    const chunkSize = 500;

    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);

      if (chunk.length === 0) {
        continue;
      }

      await db
        .insert(audienceVoteBroadcastDeliveryTable)
        .values(chunk)
        .onConflictDoNothing({
          target: [
            audienceVoteBroadcastDeliveryTable.broadcast_id,
            audienceVoteBroadcastDeliveryTable.telegram_user_id,
            audienceVoteBroadcastDeliveryTable.stage,
          ],
        });
    }
  }

  async function attachDeliveryCounts(
    broadcasts: AudienceVoteBroadcast[]
  ): Promise<AudienceVoteBroadcastSummary[]> {
    const broadcastIds = broadcasts.map((broadcast) => broadcast.id);
    const countsByBroadcast = new Map<
      string,
      AudienceVoteBroadcastDeliveryCountsByStage
    >();

    if (broadcastIds.length > 0) {
      const counts = await db
        .select({
          broadcastId: audienceVoteBroadcastDeliveryTable.broadcast_id,
          stage: audienceVoteBroadcastDeliveryTable.stage,
          status: audienceVoteBroadcastDeliveryTable.status,
          total: count(audienceVoteBroadcastDeliveryTable.id),
        })
        .from(audienceVoteBroadcastDeliveryTable)
        .where(
          inArray(
            audienceVoteBroadcastDeliveryTable.broadcast_id,
            broadcastIds
          )
        )
        .groupBy(
          audienceVoteBroadcastDeliveryTable.broadcast_id,
          audienceVoteBroadcastDeliveryTable.stage,
          audienceVoteBroadcastDeliveryTable.status
        );

      for (const row of counts) {
        const current =
          countsByBroadcast.get(row.broadcastId) ?? createEmptyDeliveryCounts();
        current[row.stage][row.status] = row.total;
        countsByBroadcast.set(row.broadcastId, current);
      }
    }

    return broadcasts.map((broadcast) => ({
      ...broadcast,
      delivery_counts:
        countsByBroadcast.get(broadcast.id) ?? createEmptyDeliveryCounts(),
    }));
  }

  return {
    claimAudienceVoteBroadcastDeliveryAttempt,
    createAudienceVoteBroadcast,
    deactivateAudienceVoteBroadcastVoter,
    getActiveBroadcastTargetVoterCount,
    getAudienceVoteBroadcast,
    getAudienceVoteBroadcastSummaries,
    getAudienceVoteBroadcastSummary,
    getDueAudienceVoteBroadcastDeliveries,
    getProcessableAudienceVoteBroadcasts,
    hasAttemptableAudienceVoteBroadcastDeliveries,
    interruptAudienceVoteBroadcast,
    markAudienceVoteBroadcastCompleted,
    markAudienceVoteBroadcastDeliverySent,
    markAudienceVoteBroadcastDeliverySkipped,
    markAudienceVoteBroadcastFailed,
    markAudienceVoteBroadcastOperatorCanarySent,
    markAudienceVoteBroadcastReady,
    markAudienceVoteBroadcastVoterCanarySent,
    recordAudienceVoteBroadcastDeliveryFailure,
  };
}

export function isAudienceVoteBroadcastInterruptible(
  status: AudienceVoteBroadcastStatus
) {
  return interruptibleBroadcastStatuses.includes(status);
}

export function buildAudienceVoteBroadcastDeliveryRows({
  activeTelegramUserIds,
  broadcastId,
  canaryVoterLimit = AUDIENCE_VOTE_BROADCAST_CANARY_VOTER_LIMIT,
  nextAttemptAt,
  operatorTelegramUserId,
}: {
  activeTelegramUserIds: number[];
  broadcastId: string;
  canaryVoterLimit?: number;
  nextAttemptAt: Date;
  operatorTelegramUserId: number;
}): InsertAudienceVoteBroadcastDelivery[] {
  const targetTelegramUserIds = activeTelegramUserIds.filter(
    (telegramUserId) => telegramUserId !== operatorTelegramUserId
  );
  const canaryTelegramUserIds = targetTelegramUserIds.slice(
    0,
    canaryVoterLimit
  );
  const canaryTelegramUserIdSet = new Set(canaryTelegramUserIds);
  const normalTelegramUserIds = targetTelegramUserIds.filter(
    (telegramUserId) => !canaryTelegramUserIdSet.has(telegramUserId)
  );

  return [
    buildDeliveryRow({
      broadcastId,
      nextAttemptAt,
      stage: "operator_canary",
      telegramUserId: operatorTelegramUserId,
    }),
    buildDeliveryRow({
      broadcastId,
      nextAttemptAt,
      stage: "voter_canary",
      telegramUserId: operatorTelegramUserId,
    }),
    ...canaryTelegramUserIds.map((telegramUserId) =>
      buildDeliveryRow({
        broadcastId,
        nextAttemptAt,
        stage: "voter_canary",
        telegramUserId,
      })
    ),
    ...normalTelegramUserIds.map((telegramUserId) =>
      buildDeliveryRow({
        broadcastId,
        nextAttemptAt,
        stage: "normal",
        telegramUserId,
      })
    ),
  ];
}

function activeBroadcastTargetWhere(operatorTelegramUserId: number) {
  return and(
    eq(telegramUsersTable.isActive, true),
    ne(telegramUsersTable.telegramUserId, operatorTelegramUserId)
  );
}

function buildDeliveryRow({
  broadcastId,
  nextAttemptAt,
  stage,
  telegramUserId,
}: {
  broadcastId: string;
  nextAttemptAt: Date;
  stage: AudienceVoteBroadcastDeliveryStage;
  telegramUserId: number;
}): InsertAudienceVoteBroadcastDelivery {
  return insertAudienceVoteBroadcastDeliverySchema.parse({
    broadcast_id: broadcastId,
    id: nanoid(12),
    next_attempt_at: nextAttemptAt,
    stage,
    status: "pending",
    telegram_user_id: telegramUserId,
  } satisfies InsertAudienceVoteBroadcastDelivery);
}

function createEmptyDeliveryCounts(): AudienceVoteBroadcastDeliveryCountsByStage {
  return {
    normal: createEmptyDeliveryStatusCounts(),
    operator_canary: createEmptyDeliveryStatusCounts(),
    voter_canary: createEmptyDeliveryStatusCounts(),
  };
}

function createEmptyDeliveryStatusCounts(): AudienceVoteBroadcastDeliveryCounts {
  return {
    failed: 0,
    pending: 0,
    sent: 0,
    skipped: 0,
  };
}
