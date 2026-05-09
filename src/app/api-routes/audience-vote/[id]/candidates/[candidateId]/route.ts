import { NextResponse } from "next/server";
import { z } from "zod";

import {
  objectKeys,
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";
import {
  audienceVoteIdSchema,
  parseVoteCandidate,
  voteCandidateIdSchema,
} from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import type { AudienceVote, VoteCandidate } from "@/shared/db/schema";
import { patchVoteCandidateClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);
const candidateManagementLockedStatuses = new Set<AudienceVote["status"]>([
  "closed",
  "open",
]);

const voteCandidateRouteParamsSchema = z.object({
  candidateId: voteCandidateIdSchema,
  id: audienceVoteIdSchema,
});

async function getEditableAudienceVote(id: string) {
  const vote = await audienceVoteService.getAudienceVote(id);

  if (!vote || vote.archived) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Not found" }, { status: 404 }),
    };
  }

  if (candidateManagementLockedStatuses.has(vote.status)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          message:
            "Candidate management is locked once an Audience Vote is open or closed.",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, vote };
}

function getCandidateForVote({
  audienceVoteId,
  candidate,
}: {
  audienceVoteId: string;
  candidate: VoteCandidate | undefined;
}) {
  if (
    !candidate ||
    candidate.archived ||
    candidate.audience_vote_id !== audienceVoteId
  ) {
    return undefined;
  }

  return candidate;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ candidateId: string; id: string }> }
) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      voteCandidateRouteParamsSchema
    );
    if (!parsedParams.ok) return parsedParams.response;

    const editableVote = await getEditableAudienceVote(parsedParams.data.id);
    if (!editableVote.ok) return editableVote.response;

    const candidate = getCandidateForVote({
      audienceVoteId: editableVote.vote.id,
      candidate: await audienceVoteService.getVoteCandidate(
        parsedParams.data.candidateId
      ),
    });
    if (!candidate) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const parsed = await parseRequestJson(
      request,
      patchVoteCandidateClientSchema,
      { errorFormat: "fieldErrors" }
    );
    if (!parsed.ok) return parsed.response;

    if (objectKeys(parsed.data).length === 0) {
      return NextResponse.json(
        { message: "Nothing to update" },
        { status: 400 }
      );
    }

    const updatedCandidate = await audienceVoteService.updateVoteCandidate(
      candidate.id,
      parsed.data
    );

    return updatedCandidate
      ? NextResponse.json(parseVoteCandidate(updatedCandidate), {
          status: 200,
        })
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("API Error updating vote candidate:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not update vote candidate.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string; id: string }> }
) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      voteCandidateRouteParamsSchema
    );
    if (!parsedParams.ok) return parsedParams.response;

    const editableVote = await getEditableAudienceVote(parsedParams.data.id);
    if (!editableVote.ok) return editableVote.response;

    const candidate = getCandidateForVote({
      audienceVoteId: editableVote.vote.id,
      candidate: await audienceVoteService.getVoteCandidate(
        parsedParams.data.candidateId
      ),
    });
    if (!candidate) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const deleted = await audienceVoteService.softDeleteVoteCandidate(
      candidate.id
    );

    return deleted
      ? NextResponse.json(deleted, { status: 200 })
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("API Error deleting vote candidate:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not delete vote candidate.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
