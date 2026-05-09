import { and, asc, count, desc, eq, ne, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import type { DrizzleDB } from "@/shared/db";
import {
  audienceVoteTable,
  audienceVoteCurrentVoteTable,
  audienceVoteUpdateScreenTable,
  telegramUsersTable,
  voteCandidateMediaTable,
  voteCandidateTable,
  type AudienceVote,
  type AudienceVoteCurrentVote,
  type AudienceVoteUpdateScreen,
  type InsertAudienceVote,
  type TelegramUser,
  type InsertVoteCandidateMedia,
  type InsertVoteCandidate,
  type VoteCandidate,
  type VoteCandidateMedia,
} from "@/shared/db/schema";
import {
  insertAudienceVoteSchema,
  insertVoteCandidateMediaSchema,
  insertVoteCandidateSchema,
  patchAudienceVoteScheduleClientSchema,
  patchVoteCandidateMediaClientSchema,
  patchVoteCandidateClientSchema,
  type PatchAudienceVoteScheduleClientOutput,
  type PatchVoteCandidateMediaClientInput,
  type PatchVoteCandidateClientInput,
  updateAudienceVoteUpdateScreenClientSchema,
  type UpdateAudienceVoteUpdateScreenClientOutput,
} from "@/shared/db/schema.zod";

export const AUDIENCE_VOTE_UPDATE_SCREEN_ID = "default";

export function buildAudienceVoteCurrentVoteInsertSelectFields({
  candidateId,
  currentVoteId,
  telegramUserId,
}: {
  candidateId: string;
  currentVoteId: string;
  telegramUserId: number;
}) {
  return {
    id: sql<string>`${currentVoteId}`.as("id"),
    audience_vote_id: audienceVoteTable.id,
    candidate_id: sql<string>`${candidateId}`.as("candidate_id"),
    telegram_user_id: sql<number>`${telegramUserId}`.as("telegram_user_id"),
    created_at: sql<Date>`now()`.as("created_at"),
    updated_at: sql<Date>`now()`.as("updated_at"),
  };
}

export interface GetAudienceVotesFilters {
  archived?: boolean;
}

export interface GetVoteCandidatesFilters {
  archived?: boolean;
  audienceVoteId: string;
}

export interface GetVoteCandidateMediaFilters {
  archived?: boolean;
  candidateId: string;
}

export interface AudienceVoteCurrentVoteCount {
  candidate_id: string;
  total_votes: number;
}

export interface UpsertTelegramVoterInput {
  firstName: string;
  telegramUserId: number;
  username?: string | null;
}

export interface GetCurrentVoteForTelegramVoterInput {
  audienceVoteId: string;
  telegramUserId: number;
}

export interface SaveCurrentVoteInput
  extends GetCurrentVoteForTelegramVoterInput {
  candidateId: string;
}

export type SaveCurrentVoteOutcome = "created" | "unchanged" | "updated";

export interface SaveCurrentVoteResult {
  currentVote: AudienceVoteCurrentVote;
  outcome: SaveCurrentVoteOutcome;
}

export interface CompleteVoteCandidateMediaUploadInput {
  mediaData: Omit<
    InsertVoteCandidateMedia,
    "archived" | "created_at" | "display_order" | "updated_at"
  >;
  replacesMediaId?: string | null;
}

export interface AudienceVoteTransitionIssue {
  code: string;
  message: string;
}

export class AudienceVoteTransitionError extends Error {
  readonly issues: AudienceVoteTransitionIssue[];
  readonly status: number;

  constructor({
    issues = [],
    message,
    status,
  }: {
    issues?: AudienceVoteTransitionIssue[];
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "AudienceVoteTransitionError";
    this.issues = issues;
    this.status = status;
  }
}

export type AudienceVoteWriteErrorCode =
  | "candidate_not_available"
  | "no_open_vote"
  | "vote_closed"
  | "vote_not_open";

export class AudienceVoteWriteError extends Error {
  readonly code: AudienceVoteWriteErrorCode;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: {
    code: AudienceVoteWriteErrorCode;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "AudienceVoteWriteError";
    this.code = code;
    this.status = status;
  }
}

export interface IAudienceVoteService {
  addAudienceVote: (voteData: InsertAudienceVote) => Promise<AudienceVote>;
  addVoteCandidate: (
    candidateData: InsertVoteCandidate
  ) => Promise<VoteCandidate>;
  closeAudienceVote: (id: string) => Promise<AudienceVote | undefined>;
  completeVoteCandidateMediaUpload: (
    input: CompleteVoteCandidateMediaUploadInput
  ) => Promise<VoteCandidateMedia>;
  getAudienceVote: (id: string) => Promise<AudienceVote | undefined>;
  getAudienceVotes: (
    filters?: GetAudienceVotesFilters
  ) => Promise<AudienceVote[]>;
  getAudienceVoteUpdateScreen: () => Promise<
    AudienceVoteUpdateScreen | undefined
  >;
  getOpenAudienceVote: (
    excludeId?: string
  ) => Promise<AudienceVote | undefined>;
  getAudienceVoteCurrentVoteCounts: (
    audienceVoteId: string
  ) => Promise<AudienceVoteCurrentVoteCount[]>;
  getCurrentVoteForTelegramVoter: (
    input: GetCurrentVoteForTelegramVoterInput
  ) => Promise<AudienceVoteCurrentVote | undefined>;
  getVoteCandidate: (id: string) => Promise<VoteCandidate | undefined>;
  getVoteCandidateMedia: (
    id: string
  ) => Promise<VoteCandidateMedia | undefined>;
  getVoteCandidateMediaList: (
    filters: GetVoteCandidateMediaFilters
  ) => Promise<VoteCandidateMedia[]>;
  getVoteCandidates: (
    filters: GetVoteCandidatesFilters
  ) => Promise<VoteCandidate[]>;
  softDeleteVoteCandidateMedia: (
    id: string
  ) => Promise<{ id: string } | undefined>;
  softDeleteVoteCandidate: (
    id: string
  ) => Promise<{ id: string } | undefined>;
  saveCurrentVote: (
    input: SaveCurrentVoteInput
  ) => Promise<SaveCurrentVoteResult>;
  updateVoteCandidate: (
    id: string,
    candidateData: PatchVoteCandidateClientInput
  ) => Promise<VoteCandidate | undefined>;
  updateVoteCandidateMedia: (
    id: string,
    mediaData: PatchVoteCandidateMediaClientInput
  ) => Promise<VoteCandidateMedia | undefined>;
  updateAudienceVoteSchedule: (
    id: string,
    input: PatchAudienceVoteScheduleClientOutput
  ) => Promise<AudienceVote | undefined>;
  openAudienceVote: (id: string) => Promise<AudienceVote | undefined>;
  upsertAudienceVoteUpdateScreen: (
    input: UpdateAudienceVoteUpdateScreenClientOutput
  ) => Promise<AudienceVoteUpdateScreen>;
  upsertTelegramVoter: (
    input: UpsertTelegramVoterInput
  ) => Promise<TelegramUser>;
}

export function createAudienceVoteService(
  db: DrizzleDB
): IAudienceVoteService {
  const getAudienceVote = async (
    id: string
  ): Promise<AudienceVote | undefined> => {
    const result = await db
      .select()
      .from(audienceVoteTable)
      .where(eq(audienceVoteTable.id, id))
      .limit(1);

    return result[0];
  };

  const getAudienceVotes = async (
    filters?: GetAudienceVotesFilters
  ): Promise<AudienceVote[]> => {
    const showArchived = filters?.archived === true;

    return db
      .select()
      .from(audienceVoteTable)
      .where(eq(audienceVoteTable.archived, showArchived))
      .orderBy(desc(audienceVoteTable.created_at));
  };

  const getAudienceVoteUpdateScreen = async (): Promise<
    AudienceVoteUpdateScreen | undefined
  > => {
    const result = await db
      .select()
      .from(audienceVoteUpdateScreenTable)
      .where(
        eq(audienceVoteUpdateScreenTable.id, AUDIENCE_VOTE_UPDATE_SCREEN_ID)
      )
      .limit(1);

    return result[0];
  };

  const upsertAudienceVoteUpdateScreen = async (
    input: UpdateAudienceVoteUpdateScreenClientOutput
  ): Promise<AudienceVoteUpdateScreen> => {
    const validatedData =
      updateAudienceVoteUpdateScreenClientSchema.parse(input);
    const [updateScreen] = await db
      .insert(audienceVoteUpdateScreenTable)
      .values({
        ...validatedData,
        id: AUDIENCE_VOTE_UPDATE_SCREEN_ID,
      })
      .onConflictDoUpdate({
        set: {
          ...validatedData,
          updated_at: new Date(),
        },
        target: audienceVoteUpdateScreenTable.id,
      })
      .returning();

    if (!updateScreen) {
      throw new Error(
        "Audience Vote Update Screen upsert failed to return the record."
      );
    }

    return updateScreen;
  };

  const getOpenAudienceVote = async (
    excludeId?: string
  ): Promise<AudienceVote | undefined> => {
    const result = await db
      .select()
      .from(audienceVoteTable)
      .where(
        excludeId
          ? and(
              eq(audienceVoteTable.archived, false),
              eq(audienceVoteTable.status, "open"),
              ne(audienceVoteTable.id, excludeId)
            )
          : and(
              eq(audienceVoteTable.archived, false),
              eq(audienceVoteTable.status, "open")
            )
      )
      .limit(1);

    return result[0];
  };

  const getAudienceVoteCurrentVoteCounts = async (
    audienceVoteId: string
  ): Promise<AudienceVoteCurrentVoteCount[]> => {
    return db
      .select({
        candidate_id: audienceVoteCurrentVoteTable.candidate_id,
        total_votes: count(audienceVoteCurrentVoteTable.id),
      })
      .from(audienceVoteCurrentVoteTable)
      .where(
        eq(audienceVoteCurrentVoteTable.audience_vote_id, audienceVoteId)
      )
      .groupBy(audienceVoteCurrentVoteTable.candidate_id);
  };

  const getCurrentVoteForTelegramVoter = async ({
    audienceVoteId,
    telegramUserId,
  }: GetCurrentVoteForTelegramVoterInput): Promise<
    AudienceVoteCurrentVote | undefined
  > => {
    const [currentVote] = await db
      .select()
      .from(audienceVoteCurrentVoteTable)
      .where(
        and(
          eq(audienceVoteCurrentVoteTable.audience_vote_id, audienceVoteId),
          eq(audienceVoteCurrentVoteTable.telegram_user_id, telegramUserId)
        )
      )
      .limit(1);

    return currentVote;
  };

  const upsertTelegramVoter = async ({
    firstName,
    telegramUserId,
    username,
  }: UpsertTelegramVoterInput): Promise<TelegramUser> => {
    const normalizedUsername = username ?? null;
    const [telegramVoter] = await db
      .insert(telegramUsersTable)
      .values({
        firstName,
        isActive: true,
        telegramUserId,
        username: normalizedUsername,
      })
      .onConflictDoUpdate({
        set: {
          firstName,
          isActive: true,
          username: normalizedUsername,
        },
        target: telegramUsersTable.telegramUserId,
      })
      .returning();

    if (!telegramVoter) {
      throw new Error("Telegram Voter upsert failed to return the record.");
    }

    return telegramVoter;
  };

  const getVoteCandidate = async (
    id: string
  ): Promise<VoteCandidate | undefined> => {
    const result = await db
      .select()
      .from(voteCandidateTable)
      .where(eq(voteCandidateTable.id, id))
      .limit(1);

    return result[0];
  };

  const getVoteCandidateMedia = async (
    id: string
  ): Promise<VoteCandidateMedia | undefined> => {
    const result = await db
      .select()
      .from(voteCandidateMediaTable)
      .where(eq(voteCandidateMediaTable.id, id))
      .limit(1);

    return result[0];
  };

  const getVoteCandidates = async ({
    archived,
    audienceVoteId,
  }: GetVoteCandidatesFilters): Promise<VoteCandidate[]> => {
    const showArchived = archived === true;

    return db
      .select()
      .from(voteCandidateTable)
      .where(
        and(
          eq(voteCandidateTable.audience_vote_id, audienceVoteId),
          eq(voteCandidateTable.archived, showArchived)
        )
      )
      .orderBy(
        asc(voteCandidateTable.display_order),
        asc(voteCandidateTable.created_at)
      );
  };

  const getVoteCandidateMediaList = async ({
    archived,
    candidateId,
  }: GetVoteCandidateMediaFilters): Promise<VoteCandidateMedia[]> => {
    if (archived === undefined) {
      return db
        .select()
        .from(voteCandidateMediaTable)
        .where(eq(voteCandidateMediaTable.candidate_id, candidateId))
        .orderBy(
          asc(voteCandidateMediaTable.archived),
          asc(voteCandidateMediaTable.display_order),
          asc(voteCandidateMediaTable.created_at)
        );
    }

    return db
      .select()
      .from(voteCandidateMediaTable)
      .where(
        and(
          eq(voteCandidateMediaTable.candidate_id, candidateId),
          eq(voteCandidateMediaTable.archived, archived)
        )
      )
      .orderBy(
        asc(voteCandidateMediaTable.display_order),
        asc(voteCandidateMediaTable.created_at)
      );
  };

  const addAudienceVote = async (
    voteData: InsertAudienceVote
  ): Promise<AudienceVote> => {
    const validatedData = insertAudienceVoteSchema.parse(voteData);

    const [newAudienceVote] = await db
      .insert(audienceVoteTable)
      .values(validatedData)
      .returning();

    if (!newAudienceVote) {
      throw new Error(
        "Audience Vote insertion failed to return the new record."
      );
    }

    return newAudienceVote;
  };

  const addVoteCandidate = async (
    candidateData: InsertVoteCandidate
  ): Promise<VoteCandidate> => {
    const validatedData = insertVoteCandidateSchema.parse(candidateData);

    const [newCandidate] = await db
      .insert(voteCandidateTable)
      .values(validatedData)
      .returning();

    if (!newCandidate) {
      throw new Error(
        "Vote Candidate insertion failed to return the new record."
      );
    }

    await reorderActiveCandidates(
      newCandidate.audience_vote_id,
      newCandidate.id,
      newCandidate.display_order
    );

    const candidate = await getVoteCandidate(newCandidate.id);
    if (!candidate) {
      throw new Error("Vote Candidate insertion failed to reload the record.");
    }

    return candidate;
  };

  const openAudienceVote = async (
    id: string
  ): Promise<AudienceVote | undefined> => {
    const currentVote = await getAudienceVote(id);

    if (!currentVote || currentVote.archived) {
      return undefined;
    }

    if (currentVote.status === "closed") {
      throw new AudienceVoteTransitionError({
        issues: [
          {
            code: "closed_final",
            message: "Closed Audience Votes cannot be reopened.",
          },
        ],
        message: "Audience Vote cannot be opened.",
        status: 409,
      });
    }

    if (currentVote.status === "open") {
      throw new AudienceVoteTransitionError({
        issues: [
          {
            code: "already_open",
            message: "This Audience Vote is already open.",
          },
        ],
        message: "Audience Vote cannot be opened.",
        status: 409,
      });
    }

    const otherOpenVote = await getOpenAudienceVote(id);
    if (otherOpenVote) {
      throw new AudienceVoteTransitionError({
        issues: [
          {
            code: "another_vote_open",
            message: `Another Audience Vote is already open: ${otherOpenVote.title}.`,
          },
        ],
        message: "Audience Vote cannot be opened.",
        status: 409,
      });
    }

    try {
      const [openedVote] = await db
        .update(audienceVoteTable)
        .set({ status: "open" })
        .where(
          and(
            eq(audienceVoteTable.id, id),
            eq(audienceVoteTable.archived, false),
            or(
              eq(audienceVoteTable.status, "draft"),
              eq(audienceVoteTable.status, "scheduled")
            )
          )
        )
        .returning();

      if (!openedVote) {
        throw new AudienceVoteTransitionError({
          issues: [
            {
              code: "not_openable_status",
              message: "Only draft or scheduled Audience Votes can be opened.",
            },
          ],
          message: "Audience Vote cannot be opened.",
          status: 409,
        });
      }

      return openedVote;
    } catch (error) {
      if (error instanceof AudienceVoteTransitionError) {
        throw error;
      }

      if (isOneOpenVoteConstraintError(error)) {
        throw new AudienceVoteTransitionError({
          issues: [
            {
              code: "another_vote_open",
              message: "Another Audience Vote is already open.",
            },
          ],
          message: "Audience Vote cannot be opened.",
          status: 409,
        });
      }

      throw error;
    }
  };

  const closeAudienceVote = async (
    id: string
  ): Promise<AudienceVote | undefined> => {
    const currentVote = await getAudienceVote(id);

    if (!currentVote || currentVote.archived) {
      return undefined;
    }

    if (currentVote.status === "closed") {
      throw new AudienceVoteTransitionError({
        issues: [
          {
            code: "already_closed",
            message: "This Audience Vote is already closed.",
          },
        ],
        message: "Audience Vote cannot be closed.",
        status: 409,
      });
    }

    if (currentVote.status !== "open") {
      throw new AudienceVoteTransitionError({
        issues: [
          {
            code: "not_open",
            message: "Only open Audience Votes can be closed.",
          },
        ],
        message: "Audience Vote cannot be closed.",
        status: 409,
      });
    }

    const [closedVote] = await db
      .update(audienceVoteTable)
      .set({ status: "closed" })
      .where(
        and(
          eq(audienceVoteTable.id, id),
          eq(audienceVoteTable.archived, false),
          eq(audienceVoteTable.status, "open")
        )
      )
      .returning();

    if (!closedVote) {
      throw new AudienceVoteTransitionError({
        issues: [
          {
            code: "not_open",
            message: "Only open Audience Votes can be closed.",
          },
        ],
        message: "Audience Vote cannot be closed.",
        status: 409,
      });
    }

    return closedVote;
  };

  const updateAudienceVoteSchedule = async (
    id: string,
    input: PatchAudienceVoteScheduleClientOutput
  ): Promise<AudienceVote | undefined> => {
    const currentVote = await getAudienceVote(id);

    if (!currentVote || currentVote.archived) {
      return undefined;
    }

    if (currentVote.status === "open" || currentVote.status === "closed") {
      throw new AudienceVoteTransitionError({
        issues: [
          {
            code: "schedule_locked",
            message:
              "Schedule can only be edited before an Audience Vote is opened.",
          },
        ],
        message: "Audience Vote schedule cannot be updated.",
        status: 409,
      });
    }

    const validatedData = patchAudienceVoteScheduleClientSchema.parse(input);
    const [updatedVote] = await db
      .update(audienceVoteTable)
      .set(validatedData)
      .where(
        and(
          eq(audienceVoteTable.id, id),
          eq(audienceVoteTable.archived, false),
          or(
            eq(audienceVoteTable.status, "draft"),
            eq(audienceVoteTable.status, "scheduled")
          )
        )
      )
      .returning();

    return updatedVote;
  };

  const saveCurrentVote = async ({
    audienceVoteId,
    candidateId,
    telegramUserId,
  }: SaveCurrentVoteInput): Promise<SaveCurrentVoteResult> => {
    const openVote = await getOpenAudienceVote();

    if (!openVote) {
      await assertVoteIsNotClosed(audienceVoteId);
      throw new AudienceVoteWriteError({
        code: "no_open_vote",
        message: "No Audience Vote is open for voting.",
        status: 409,
      });
    }

    if (openVote.id !== audienceVoteId) {
      await assertVoteIsNotClosed(audienceVoteId);
      throw new AudienceVoteWriteError({
        code: "vote_not_open",
        message: "This Audience Vote is not the current open vote.",
        status: 409,
      });
    }

    await assertCandidateCanReceiveVote({
      audienceVoteId: openVote.id,
      candidateId,
    });

    const existingVote = await getCurrentVoteForTelegramVoter({
      audienceVoteId,
      telegramUserId,
    });

    if (existingVote?.candidate_id === candidateId) {
      return { currentVote: existingVote, outcome: "unchanged" };
    }

    if (existingVote) {
      return {
        currentVote: await updateExistingCurrentVote({
          audienceVoteId,
          candidateId,
          currentVoteId: existingVote.id,
        }),
        outcome: "updated",
      };
    }

    const insertedVote = await insertCurrentVoteIfOpen({
      audienceVoteId,
      candidateId,
      telegramUserId,
    });

    if (insertedVote) {
      return { currentVote: insertedVote, outcome: "created" };
    }

    const conflictedVote = await getCurrentVoteForTelegramVoter({
      audienceVoteId,
      telegramUserId,
    });

    if (!conflictedVote) {
      await assertVoteIsOpenForWrite(audienceVoteId);

      throw new Error(
        "Audience Vote current vote insert conflicted, but no existing vote was found."
      );
    }

    if (conflictedVote.candidate_id === candidateId) {
      return { currentVote: conflictedVote, outcome: "unchanged" };
    }

    return {
      currentVote: await updateExistingCurrentVote({
        audienceVoteId,
        candidateId,
        currentVoteId: conflictedVote.id,
      }),
      outcome: "updated",
    };
  };

  const completeVoteCandidateMediaUpload = async ({
    mediaData,
    replacesMediaId,
  }: CompleteVoteCandidateMediaUploadInput): Promise<VoteCandidateMedia> => {
    const existingMedia = await getVoteCandidateMedia(mediaData.id);

    if (existingMedia) {
      await archiveReplacementMediaIfNeeded(
        existingMedia.candidate_id,
        replacesMediaId
      );
      return existingMedia;
    }

    if (replacesMediaId) {
      await assertReplaceableMedia(mediaData.candidate_id, replacesMediaId);
    }

    const activeMedia = await getVoteCandidateMediaList({
      archived: false,
      candidateId: mediaData.candidate_id,
    });
    const validatedData = insertVoteCandidateMediaSchema.parse({
      ...mediaData,
      archived: false,
      display_order: activeMedia.length + 1,
    });

    const [newMedia] = await db
      .insert(voteCandidateMediaTable)
      .values(validatedData)
      .returning();

    if (!newMedia) {
      throw new Error(
        "Vote Candidate Media insertion failed to return the new record."
      );
    }

    if (replacesMediaId) {
      await softDeleteVoteCandidateMedia(replacesMediaId);
    }

    const media = await getVoteCandidateMedia(newMedia.id);
    if (!media) {
      throw new Error(
        "Vote Candidate Media insertion failed to reload the record."
      );
    }

    return media;
  };

  const updateVoteCandidate = async (
    id: string,
    candidateData: PatchVoteCandidateClientInput
  ): Promise<VoteCandidate | undefined> => {
    const currentCandidate = await getVoteCandidate(id);
    if (!currentCandidate || currentCandidate.archived) {
      return undefined;
    }

    const validatedData =
      patchVoteCandidateClientSchema.parse(candidateData);
    const { display_order, ...candidatePatch } = validatedData;

    if (Object.keys(candidatePatch).length > 0) {
      await db
        .update(voteCandidateTable)
        .set(candidatePatch)
        .where(eq(voteCandidateTable.id, id))
        .returning();
    }

    if (display_order !== undefined) {
      await reorderActiveCandidates(
        currentCandidate.audience_vote_id,
        id,
        display_order
      );
    }

    return getVoteCandidate(id);
  };

  const updateVoteCandidateMedia = async (
    id: string,
    mediaData: PatchVoteCandidateMediaClientInput
  ): Promise<VoteCandidateMedia | undefined> => {
    const currentMedia = await getVoteCandidateMedia(id);
    if (!currentMedia || currentMedia.archived) {
      return undefined;
    }

    const validatedData = patchVoteCandidateMediaClientSchema.parse(mediaData);
    await reorderActiveCandidateMedia(
      currentMedia.candidate_id,
      id,
      validatedData.display_order
    );

    return getVoteCandidateMedia(id);
  };

  const softDeleteVoteCandidate = async (
    id: string
  ): Promise<{ id: string } | undefined> => {
    const currentCandidate = await getVoteCandidate(id);
    if (!currentCandidate || currentCandidate.archived) {
      return undefined;
    }

    const [deletedCandidate] = await db
      .update(voteCandidateTable)
      .set({ archived: true })
      .where(eq(voteCandidateTable.id, id))
      .returning({ id: voteCandidateTable.id });

    await reorderActiveCandidates(currentCandidate.audience_vote_id);

    return deletedCandidate;
  };

  const softDeleteVoteCandidateMedia = async (
    id: string
  ): Promise<{ id: string } | undefined> => {
    const currentMedia = await getVoteCandidateMedia(id);
    if (!currentMedia || currentMedia.archived) {
      return undefined;
    }

    const [deletedMedia] = await db
      .update(voteCandidateMediaTable)
      .set({ archived: true })
      .where(eq(voteCandidateMediaTable.id, id))
      .returning({ id: voteCandidateMediaTable.id });

    await reorderActiveCandidateMedia(currentMedia.candidate_id);

    return deletedMedia;
  };

  async function assertReplaceableMedia(
    candidateId: string,
    mediaId: string
  ) {
    const media = await getVoteCandidateMedia(mediaId);

    if (!media || media.archived || media.candidate_id !== candidateId) {
      throw new Error("Replacement media was not found.");
    }
  }

  async function archiveReplacementMediaIfNeeded(
    candidateId: string,
    mediaId: string | null | undefined
  ) {
    if (!mediaId) {
      return;
    }

    const media = await getVoteCandidateMedia(mediaId);
    if (media && !media.archived && media.candidate_id === candidateId) {
      await softDeleteVoteCandidateMedia(media.id);
    }
  }

  async function assertVoteIsNotClosed(audienceVoteId: string) {
    const requestedVote = await getAudienceVote(audienceVoteId);

    if (requestedVote?.status === "closed") {
      throw new AudienceVoteWriteError({
        code: "vote_closed",
        message: "This Audience Vote is closed.",
        status: 409,
      });
    }
  }

  async function assertVoteIsOpenForWrite(audienceVoteId: string) {
    const requestedVote = await getAudienceVote(audienceVoteId);

    if (
      requestedVote &&
      !requestedVote.archived &&
      requestedVote.status === "open"
    ) {
      return;
    }

    if (requestedVote?.status === "closed") {
      throw new AudienceVoteWriteError({
        code: "vote_closed",
        message: "This Audience Vote is closed.",
        status: 409,
      });
    }

    throw new AudienceVoteWriteError({
      code: "vote_not_open",
      message: "This Audience Vote is not open for voting.",
      status: 409,
    });
  }

  async function assertCandidateCanReceiveVote({
    audienceVoteId,
    candidateId,
  }: {
    audienceVoteId: string;
    candidateId: string;
  }) {
    const candidate = await getVoteCandidate(candidateId);

    if (
      !candidate ||
      candidate.archived ||
      candidate.audience_vote_id !== audienceVoteId
    ) {
      throw new AudienceVoteWriteError({
        code: "candidate_not_available",
        message: "This Vote Candidate is not available for the open vote.",
        status: 400,
      });
    }
  }

  async function insertCurrentVoteIfOpen({
    audienceVoteId,
    candidateId,
    telegramUserId,
  }: {
    audienceVoteId: string;
    candidateId: string;
    telegramUserId: number;
  }): Promise<AudienceVoteCurrentVote | undefined> {
    const currentVoteId = nanoid(12);
    const [insertedVote] = await db
      .insert(audienceVoteCurrentVoteTable)
      .select((qb) =>
        qb
          .select(
            buildAudienceVoteCurrentVoteInsertSelectFields({
              candidateId,
              currentVoteId,
              telegramUserId,
            })
          )
          .from(audienceVoteTable)
          .where(
            and(
              eq(audienceVoteTable.id, audienceVoteId),
              eq(audienceVoteTable.archived, false),
              eq(audienceVoteTable.status, "open")
            )
          )
      )
      .onConflictDoNothing({
        target: [
          audienceVoteCurrentVoteTable.audience_vote_id,
          audienceVoteCurrentVoteTable.telegram_user_id,
        ],
      })
      .returning();

    return insertedVote;
  }

  async function updateExistingCurrentVote({
    audienceVoteId,
    candidateId,
    currentVoteId,
  }: {
    audienceVoteId: string;
    candidateId: string;
    currentVoteId: string;
  }): Promise<AudienceVoteCurrentVote> {
    const [updatedVote] = await db
      .update(audienceVoteCurrentVoteTable)
      .set({
        candidate_id: candidateId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(audienceVoteCurrentVoteTable.id, currentVoteId),
          eq(audienceVoteCurrentVoteTable.audience_vote_id, audienceVoteId),
          sql`exists (
            select 1
            from ${audienceVoteTable}
            where ${audienceVoteTable.id} = ${audienceVoteCurrentVoteTable.audience_vote_id}
              and ${audienceVoteTable.status} = 'open'
              and ${audienceVoteTable.archived} = false
          )`
        )
      )
      .returning();

    if (!updatedVote) {
      await assertVoteIsOpenForWrite(audienceVoteId);

      throw new Error("Audience Vote current vote update returned no record.");
    }

    return updatedVote;
  }

  async function reorderActiveCandidates(
    audienceVoteId: string,
    movedCandidateId?: string,
    targetOrder?: number
  ) {
    const candidates = await getVoteCandidates({
      archived: false,
      audienceVoteId,
    });

    const orderedCandidates = [...candidates];

    if (movedCandidateId && targetOrder !== undefined) {
      const currentIndex = orderedCandidates.findIndex(
        (candidate) => candidate.id === movedCandidateId
      );

      if (currentIndex >= 0) {
        const removedCandidates = orderedCandidates.splice(currentIndex, 1);
        const movedCandidate = removedCandidates[0];

        if (movedCandidate) {
          const targetIndex = Math.min(
            Math.max(targetOrder - 1, 0),
            orderedCandidates.length
          );
          orderedCandidates.splice(targetIndex, 0, movedCandidate);
        }
      }
    }

    for (const [index, candidate] of orderedCandidates.entries()) {
      const nextOrder = index + 1;

      if (candidate.display_order === nextOrder) {
        continue;
      }

      await db
        .update(voteCandidateTable)
        .set({ display_order: nextOrder })
        .where(eq(voteCandidateTable.id, candidate.id));
    }
  }

  async function reorderActiveCandidateMedia(
    candidateId: string,
    movedMediaId?: string,
    targetOrder?: number
  ) {
    const mediaList = await getVoteCandidateMediaList({
      archived: false,
      candidateId,
    });

    const orderedMedia = [...mediaList];

    if (movedMediaId && targetOrder !== undefined) {
      const currentIndex = orderedMedia.findIndex(
        (media) => media.id === movedMediaId
      );

      if (currentIndex >= 0) {
        const removedMedia = orderedMedia.splice(currentIndex, 1);
        const movedMedia = removedMedia[0];

        if (movedMedia) {
          const targetIndex = Math.min(
            Math.max(targetOrder - 1, 0),
            orderedMedia.length
          );
          orderedMedia.splice(targetIndex, 0, movedMedia);
        }
      }
    }

    for (const [index, media] of orderedMedia.entries()) {
      const nextOrder = index + 1;

      if (media.display_order === nextOrder) {
        continue;
      }

      await db
        .update(voteCandidateMediaTable)
        .set({ display_order: nextOrder })
        .where(eq(voteCandidateMediaTable.id, media.id));
    }
  }

  return {
    addAudienceVote,
    addVoteCandidate,
    closeAudienceVote,
    completeVoteCandidateMediaUpload,
    getAudienceVote,
    getAudienceVoteCurrentVoteCounts,
    getAudienceVotes,
    getAudienceVoteUpdateScreen,
    getCurrentVoteForTelegramVoter,
    getOpenAudienceVote,
    getVoteCandidate,
    getVoteCandidateMedia,
    getVoteCandidateMediaList,
    getVoteCandidates,
    openAudienceVote,
    saveCurrentVote,
    softDeleteVoteCandidateMedia,
    softDeleteVoteCandidate,
    updateAudienceVoteSchedule,
    updateVoteCandidate,
    updateVoteCandidateMedia,
    upsertAudienceVoteUpdateScreen,
    upsertTelegramVoter,
  };
}

function isOneOpenVoteConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    constraint?: unknown;
    message?: unknown;
  };

  return (
    maybeError.constraint === "audience_vote_one_open_active_idx" ||
    (typeof maybeError.message === "string" &&
      maybeError.message.includes("audience_vote_one_open_active_idx"))
  );
}

