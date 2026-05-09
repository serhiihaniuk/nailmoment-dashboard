import { NextResponse } from "next/server";

import { db } from "@/shared/db";
import {
  createAudienceVoteBroadcastService,
  type AudienceVoteBroadcastSummary,
} from "@/shared/db/service/audience-vote-broadcast-service";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import {
  ensureAudienceVoteOpeningBroadcast,
  ensureOpenAudienceVoteOpeningBroadcast,
} from "../opening-broadcast";
import { validateAudienceVoteBroadcastProcessorSecret } from "../broadcasts/processor-auth";
import { validateAudienceVoteCanOpen } from "../[id]/transition-response";

const audienceVoteService = createAudienceVoteService(db);
const audienceVoteBroadcastService = createAudienceVoteBroadcastService(db);

export async function GET(request: Request) {
  try {
    const unauthorized = validateAudienceVoteBroadcastProcessorSecret(request);
    if (unauthorized) return unauthorized;

    const now = new Date();
    const closedVotes =
      await audienceVoteService.closeExpiredOpenAudienceVotes(now);
    const dueScheduledVotes =
      await audienceVoteService.getDueScheduledAudienceVotes(now);
    let openedVoteId: string | null = null;
    let openingBroadcast: AudienceVoteBroadcastSummary | undefined;
    let openingBroadcastError: string | null = null;
    const skippedVoteIds: string[] = [];

    for (const vote of dueScheduledVotes) {
      const validationResponse = await validateAudienceVoteCanOpen({
        audienceVoteId: vote.id,
        service: audienceVoteService,
      });

      if (validationResponse) {
        skippedVoteIds.push(vote.id);
        continue;
      }

      const openedVote = await audienceVoteService.openAudienceVote(vote.id);

      if (openedVote) {
        openedVoteId = openedVote.id;
        try {
          openingBroadcast = await ensureAudienceVoteOpeningBroadcast({
            broadcastService: audienceVoteBroadcastService,
            now,
            vote: openedVote,
          });
        } catch (error) {
          openingBroadcastError = getErrorMessage(error);
          console.error(
            "API Error creating opening audience vote broadcast:",
            error
          );
        }
        break;
      }

      skippedVoteIds.push(vote.id);
    }

    if (!openedVoteId) {
      try {
        openingBroadcast = await ensureOpenAudienceVoteOpeningBroadcast({
          broadcastService: audienceVoteBroadcastService,
          now,
          voteService: audienceVoteService,
        });
      } catch (error) {
        openingBroadcastError = getErrorMessage(error);
        console.error(
          "API Error recovering opening audience vote broadcast:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        closed: closedVotes.length,
        opening_broadcast: openingBroadcast ? 1 : 0,
        opened: openedVoteId ? 1 : 0,
        skipped: skippedVoteIds.length,
        closed_vote_ids: closedVotes.map((vote) => vote.id),
        opening_broadcast_error: openingBroadcastError,
        opening_broadcast_ids: openingBroadcast ? [openingBroadcast.id] : [],
        opened_vote_ids: openedVoteId ? [openedVoteId] : [],
        skipped_vote_ids: skippedVoteIds,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error processing audience vote lifecycle:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not process Audience Vote lifecycle.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
