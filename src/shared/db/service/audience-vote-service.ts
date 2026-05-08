import { and, asc, desc, eq } from "drizzle-orm";

import type { DrizzleDB } from "@/shared/db";
import {
  audienceVoteTable,
  voteCandidateTable,
  type AudienceVote,
  type InsertAudienceVote,
  type InsertVoteCandidate,
  type VoteCandidate,
} from "@/shared/db/schema";
import {
  insertAudienceVoteSchema,
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

export interface IAudienceVoteService {
  addAudienceVote: (voteData: InsertAudienceVote) => Promise<AudienceVote>;
  addVoteCandidate: (
    candidateData: InsertVoteCandidate
  ) => Promise<VoteCandidate>;
  getAudienceVote: (id: string) => Promise<AudienceVote | undefined>;
  getAudienceVotes: (
    filters?: GetAudienceVotesFilters
  ) => Promise<AudienceVote[]>;
  getVoteCandidate: (id: string) => Promise<VoteCandidate | undefined>;
  getVoteCandidates: (
    filters: GetVoteCandidatesFilters
  ) => Promise<VoteCandidate[]>;
  softDeleteVoteCandidate: (
    id: string
  ) => Promise<{ id: string } | undefined>;
  updateVoteCandidate: (
    id: string,
    candidateData: PatchVoteCandidateClientInput
  ) => Promise<VoteCandidate | undefined>;
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

  return {
    addAudienceVote,
    addVoteCandidate,
    getAudienceVote,
    getAudienceVotes,
    getVoteCandidate,
    getVoteCandidates,
    softDeleteVoteCandidate,
    updateVoteCandidate,
  };
}

