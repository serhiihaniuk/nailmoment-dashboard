import { and, asc, count, desc, eq, ne, or } from "drizzle-orm";

import type { DrizzleDB } from "@/shared/db";
import {
  audienceVoteTable,
  audienceVoteCurrentVoteTable,
  voteCandidateMediaTable,
  voteCandidateTable,
  type AudienceVote,
  type InsertAudienceVote,
  type InsertVoteCandidateMedia,
  type InsertVoteCandidate,
  type VoteCandidate,
  type VoteCandidateMedia,
} from "@/shared/db/schema";
import {
  insertAudienceVoteSchema,
  insertVoteCandidateMediaSchema,
  insertVoteCandidateSchema,
  patchVoteCandidateClientSchema,
  type PatchVoteCandidateClientInput,
} from "@/shared/db/schema.zod";

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
  getOpenAudienceVote: (
    excludeId?: string
  ) => Promise<AudienceVote | undefined>;
  getAudienceVoteCurrentVoteCounts: (
    audienceVoteId: string
  ) => Promise<AudienceVoteCurrentVoteCount[]>;
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
  updateVoteCandidate: (
    id: string,
    candidateData: PatchVoteCandidateClientInput
  ) => Promise<VoteCandidate | undefined>;
  openAudienceVote: (id: string) => Promise<AudienceVote | undefined>;
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

  async function reorderActiveCandidateMedia(candidateId: string) {
    const mediaList = await getVoteCandidateMediaList({
      archived: false,
      candidateId,
    });

    for (const [index, media] of mediaList.entries()) {
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
    getOpenAudienceVote,
    getVoteCandidate,
    getVoteCandidateMedia,
    getVoteCandidateMediaList,
    getVoteCandidates,
    openAudienceVote,
    softDeleteVoteCandidateMedia,
    softDeleteVoteCandidate,
    updateVoteCandidate,
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

