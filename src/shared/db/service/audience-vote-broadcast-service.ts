import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
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

export interface GetPendingAudienceVoteBroadcastDeliveriesInput {
  broadcastId: string;
  limit: number;
  stage: AudienceVoteBroadcastDeliveryStage;
}

export class AudienceVoteBroadcastInterruptError extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "AudienceVoteBroadcastInterruptError";
  }
}

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

    await insertDeliveryRows([
      buildDeliveryRow({
        broadcastId,
        stage: "operator_canary",
        telegramUserId: operatorTelegramUserId,
      }),
      buildDeliveryRow({
        broadcastId,
        stage: "voter_canary",
        telegramUserId: operatorTelegramUserId,
      }),
      ...canaryVoters.map((voter) =>
        buildDeliveryRow({
          broadcastId,
          stage: "voter_canary",
          telegramUserId: voter.telegramUserId,
        })
      ),
      ...activeVoters.map((voter) =>
        buildDeliveryRow({
          broadcastId,
          stage: "normal",
          telegramUserId: voter.telegramUserId,
        })
      ),
    ]);

    const summary = await getAudienceVoteBroadcastSummary(broadcast.id);
    if (!summary) {
      throw new Error("Audience Vote Broadcast insertion failed to reload.");
    }

    return summary;
  };

  const getPendingAudienceVoteBroadcastDeliveries = async ({
    broadcastId,
    limit,
    stage,
  }: GetPendingAudienceVoteBroadcastDeliveriesInput): Promise<
    AudienceVoteBroadcastDelivery[]
  > => {
    return db
      .select()
      .from(audienceVoteBroadcastDeliveryTable)
      .where(
        and(
          eq(audienceVoteBroadcastDeliveryTable.broadcast_id, broadcastId),
          eq(audienceVoteBroadcastDeliveryTable.stage, stage),
          eq(audienceVoteBroadcastDeliveryTable.status, "pending")
        )
      )
      .orderBy(asc(audienceVoteBroadcastDeliveryTable.created_at))
      .limit(limit);
  };

  const markAudienceVoteBroadcastDeliverySent = async (
    id: string,
    sentAt = new Date()
  ): Promise<void> => {
    await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        attempt_count: sql`${audienceVoteBroadcastDeliveryTable.attempt_count} + 1`,
        last_error: null,
        sent_at: sentAt,
        status: "sent",
        updated_at: sentAt,
      })
      .where(eq(audienceVoteBroadcastDeliveryTable.id, id));
  };

  const markAudienceVoteBroadcastDeliveryFailed = async ({
    errorMessage,
    id,
    now = new Date(),
  }: {
    errorMessage: string;
    id: string;
    now?: Date;
  }): Promise<void> => {
    await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        attempt_count: sql`${audienceVoteBroadcastDeliveryTable.attempt_count} + 1`,
        last_error: errorMessage.slice(0, 1000),
        status: "failed",
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
      .where(eq(audienceVoteBroadcastTable.id, broadcastId));

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
      .where(eq(audienceVoteBroadcastTable.id, broadcastId));

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
      .where(eq(audienceVoteBroadcastTable.id, broadcastId));

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
      .where(eq(audienceVoteBroadcastTable.id, broadcastId));

    return getAudienceVoteBroadcastSummary(broadcastId);
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

    if (!isAudienceVoteBroadcastCanaryInterruptible(broadcast.status)) {
      throw new AudienceVoteBroadcastInterruptError(
        "Only an active Audience Vote Broadcast canary can be interrupted."
      );
    }

    await db
      .update(audienceVoteBroadcastTable)
      .set({
        interrupted_at: now,
        status: "interrupted",
        updated_at: now,
      })
      .where(eq(audienceVoteBroadcastTable.id, broadcastId));

    await db
      .update(audienceVoteBroadcastDeliveryTable)
      .set({
        last_error: "Interrupted by Operator.",
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
    createAudienceVoteBroadcast,
    getActiveBroadcastTargetVoterCount,
    getAudienceVoteBroadcast,
    getAudienceVoteBroadcastSummaries,
    getAudienceVoteBroadcastSummary,
    getPendingAudienceVoteBroadcastDeliveries,
    interruptAudienceVoteBroadcast,
    markAudienceVoteBroadcastDeliveryFailed,
    markAudienceVoteBroadcastDeliverySent,
    markAudienceVoteBroadcastFailed,
    markAudienceVoteBroadcastOperatorCanarySent,
    markAudienceVoteBroadcastReady,
    markAudienceVoteBroadcastVoterCanarySent,
  };
}

export function isAudienceVoteBroadcastCanaryInterruptible(
  status: AudienceVoteBroadcastStatus
) {
  return (
    status === "canary_operator_pending" ||
    status === "canary_operator_sent" ||
    status === "canary_voters_sent"
  );
}

function activeBroadcastTargetWhere(operatorTelegramUserId: number) {
  return and(
    eq(telegramUsersTable.isActive, true),
    ne(telegramUsersTable.telegramUserId, operatorTelegramUserId)
  );
}

function buildDeliveryRow({
  broadcastId,
  stage,
  telegramUserId,
}: {
  broadcastId: string;
  stage: AudienceVoteBroadcastDeliveryStage;
  telegramUserId: number;
}): InsertAudienceVoteBroadcastDelivery {
  return insertAudienceVoteBroadcastDeliverySchema.parse({
    broadcast_id: broadcastId,
    id: nanoid(12),
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
