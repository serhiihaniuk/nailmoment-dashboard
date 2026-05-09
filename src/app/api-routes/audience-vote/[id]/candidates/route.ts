import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  parseRequestJson,
  parseRouteParams,
} from "@/app/api-routes/lib/request";
import {
  audienceVoteIdSchema,
  parseVoteCandidate,
  parseVoteCandidateList,
} from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import type { AudienceVote, InsertVoteCandidate } from "@/shared/db/schema";
import { createVoteCandidateClientSchema } from "@/shared/db/schema.zod";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);
const candidateManagementLockedStatuses = new Set<AudienceVote["status"]>([
  "closed",
  "open",
]);

function toDbVoteCandidatePayload({
  audienceVoteId,
  displayOrder,
  input,
}: {
  audienceVoteId: string;
  displayOrder: number;
  input: z.output<typeof createVoteCandidateClientSchema>;
}): InsertVoteCandidate {
  return {
    archived: false,
    audience_vote_id: audienceVoteId,
    caption: input.caption,
    display_name: input.display_name,
    display_order: displayOrder,
    id: nanoid(12),
    internal_name: input.internal_name,
  };
}

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      z.object({ id: audienceVoteIdSchema })
    );
    if (!parsedParams.ok) return parsedParams.response;

    const vote = await audienceVoteService.getAudienceVote(
      parsedParams.data.id
    );
    if (!vote || vote.archived) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const candidates = await audienceVoteService.getVoteCandidates({
      archived: false,
      audienceVoteId: parsedParams.data.id,
    });

    return NextResponse.json(parseVoteCandidateList(candidates), {
      status: 200,
    });
  } catch (error) {
    console.error("API Error fetching vote candidates:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch vote candidates.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = await parseRouteParams(
      params,
      z.object({ id: audienceVoteIdSchema })
    );
    if (!parsedParams.ok) return parsedParams.response;

    const editableVote = await getEditableAudienceVote(parsedParams.data.id);
    if (!editableVote.ok) return editableVote.response;

    const parsed = await parseRequestJson(
      request,
      createVoteCandidateClientSchema,
      { errorFormat: "fieldErrors" }
    );
    if (!parsed.ok) return parsed.response;

    const existingCandidates = await audienceVoteService.getVoteCandidates({
      archived: false,
      audienceVoteId: editableVote.vote.id,
    });
    const nextDisplayOrder =
      parsed.data.display_order ?? existingCandidates.length + 1;

    const candidate = await audienceVoteService.addVoteCandidate(
      toDbVoteCandidatePayload({
        audienceVoteId: editableVote.vote.id,
        displayOrder: nextDisplayOrder,
        input: parsed.data,
      })
    );

    return NextResponse.json(parseVoteCandidate(candidate), { status: 201 });
  } catch (error) {
    console.error("API Error adding vote candidate:", error);
    const message =
      error instanceof Error ? error.message : "Could not add vote candidate.";

    return NextResponse.json(
      { message: `Internal Server Error: ${message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
