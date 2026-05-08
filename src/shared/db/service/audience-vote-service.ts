import { desc, eq } from "drizzle-orm";

import type { DrizzleDB } from "@/shared/db";
import {
  audienceVoteTable,
  type AudienceVote,
  type InsertAudienceVote,
} from "@/shared/db/schema";
import { insertAudienceVoteSchema } from "@/shared/db/schema.zod";

export interface GetAudienceVotesFilters {
  archived?: boolean;
}

export interface IAudienceVoteService {
  addAudienceVote: (voteData: InsertAudienceVote) => Promise<AudienceVote>;
  getAudienceVotes: (
    filters?: GetAudienceVotesFilters
  ) => Promise<AudienceVote[]>;
}

export function createAudienceVoteService(
  db: DrizzleDB
): IAudienceVoteService {
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

  return {
    addAudienceVote,
    getAudienceVotes,
  };
}

