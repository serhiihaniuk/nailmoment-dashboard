import { head, type HeadBlobResult } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  parseRouteParams,
  readRequestJson,
  validationErrorResponse,
} from "@/app/api-routes/lib/request";
import {
  audienceVoteIdSchema,
  buildVoteCandidateMediaPath,
  getVoteCandidateMediaMaxSizeBytes,
  getVoteCandidateMediaTypeForContentType,
  voteCandidateIdSchema,
  voteCandidateMediaUploadPayloadSchema,
  type VoteCandidateMediaUploadPayload,
} from "@/entities/audience-vote";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import type { VoteCandidate } from "@/shared/db/schema";
import { createAudienceVoteService } from "@/shared/db/service/audience-vote-service";

const audienceVoteService = createAudienceVoteService(db);
const uploadTokenLifetimeMs = 15 * 60 * 1000;

const routeParamsSchema = z.object({
  candidateId: voteCandidateIdSchema,
  id: audienceVoteIdSchema,
});

const completedBlobSchema = z.object({
  contentDisposition: z.string(),
  contentType: z.string().min(1),
  downloadUrl: z.string().url(),
  etag: z.string(),
  pathname: z.string().min(1),
  url: z.string().url(),
});

const blobUploadBodySchema = z.discriminatedUnion("type", [
  z.object({
    payload: z.object({
      clientPayload: z.string().nullable(),
      multipart: z.boolean(),
      pathname: z.string().min(1),
    }),
    type: z.literal("blob.generate-client-token"),
  }),
  z.object({
    payload: z.object({
      blob: z.object({
        contentDisposition: z.string(),
        contentType: z.string().min(1),
        downloadUrl: z.string().url(),
        etag: z.string(),
        pathname: z.string().min(1),
        url: z.string().url(),
      }),
      tokenPayload: z.string().nullable(),
    }),
    type: z.literal("blob.upload-completed"),
  }),
  z.object({
    payload: z.object({
      blob: completedBlobSchema,
      clientPayload: z.string().nullable(),
    }),
    type: z.literal("app.confirm-client-upload"),
  }),
]);

type CompletedBlob = z.output<typeof completedBlobSchema>;

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

function parseUploadPayload(
  payload: string | null | undefined
): VoteCandidateMediaUploadPayload {
  if (!payload) {
    throw new Error("Missing upload payload.");
  }

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    throw new Error("Invalid upload payload JSON.");
  }

  const parsed = voteCandidateMediaUploadPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid upload payload."
    );
  }

  return parsed.data;
}

function assertPayloadMatchesRoute({
  candidateId,
  payload,
  voteId,
}: {
  candidateId: string;
  payload: VoteCandidateMediaUploadPayload;
  voteId: string;
}) {
  if (payload.audienceVoteId !== voteId || payload.candidateId !== candidateId) {
    throw new Error("Upload payload does not match this Vote Candidate.");
  }
}

async function assertCompletedBlobMatchesPayload({
  blob,
  payload,
}: {
  blob: CompletedBlob;
  payload: VoteCandidateMediaUploadPayload;
}): Promise<HeadBlobResult> {
  const expectedPath = buildVoteCandidateMediaPath(payload);

  if (blob.pathname !== expectedPath) {
    throw new Error("Completed Blob path does not match token payload.");
  }

  if (blob.contentType !== payload.contentType) {
    throw new Error("Completed Blob content type does not match payload.");
  }

  const blobMetadata = await head(expectedPath);

  if (
    blobMetadata.pathname !== expectedPath ||
    blobMetadata.contentType !== payload.contentType ||
    blobMetadata.size !== payload.sizeBytes
  ) {
    throw new Error("Completed Blob metadata does not match token payload.");
  }

  return blobMetadata;
}

async function getUploadableCandidate({
  allowClosed,
  candidateId,
  voteId,
}: {
  allowClosed: boolean;
  candidateId: string;
  voteId: string;
}) {
  const vote = await audienceVoteService.getAudienceVote(voteId);
  if (!vote || vote.archived) {
    throw new Error("Audience Vote was not found.");
  }

  if (!allowClosed && vote.status === "closed") {
    throw new Error("Media management is locked for a closed Audience Vote.");
  }

  const candidate = getCandidateForVote({
    audienceVoteId: vote.id,
    candidate: await audienceVoteService.getVoteCandidate(candidateId),
  });
  if (!candidate) {
    throw new Error("Vote Candidate was not found.");
  }

  return { candidate, vote };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ candidateId: string; id: string }> }
) {
  const json = await readRequestJson(request);
  if (!json.ok) return json.response;

  const parsedBody = blobUploadBodySchema.safeParse(json.data);
  if (!parsedBody.success) {
    return validationErrorResponse(parsedBody.error);
  }

  const body = parsedBody.data;
  const parsedParams = await parseRouteParams(params, routeParamsSchema);
  if (!parsedParams.ok) return parsedParams.response;

  if (body.type === "app.confirm-client-upload") {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
      const media = await completeUploadedMedia({
        allowClosed: true,
        blob: body.payload.blob,
        candidateId: parsedParams.data.candidateId,
        clientPayload: body.payload.clientPayload,
        voteId: parsedParams.data.id,
      });

      return NextResponse.json(media, { status: 200 });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not confirm vote candidate media upload.";

      return NextResponse.json({ message }, { status: 400 });
    }
  }

  if (body.type === "blob.generate-client-token") {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const uploadBody: HandleUploadBody = body;
    const jsonResponse = await handleUpload({
      body: uploadBody,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseUploadPayload(clientPayload);
        assertPayloadMatchesRoute({
          candidateId: parsedParams.data.candidateId,
          payload,
          voteId: parsedParams.data.id,
        });

        await getUploadableCandidate({
          allowClosed: false,
          candidateId: payload.candidateId,
          voteId: payload.audienceVoteId,
        });

        const expectedPath = buildVoteCandidateMediaPath(payload);
        if (pathname !== expectedPath) {
          throw new Error("Upload path does not match the app-controlled path.");
        }

        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          allowedContentTypes: [payload.contentType],
          maximumSizeInBytes: getVoteCandidateMediaMaxSizeBytes(
            payload.contentType
          ),
          tokenPayload: JSON.stringify(payload),
          validUntil: Date.now() + uploadTokenLifetimeMs,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        await completeUploadedMedia({
          allowClosed: true,
          blob,
          candidateId: parsedParams.data.candidateId,
          clientPayload: tokenPayload,
          voteId: parsedParams.data.id,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not process vote candidate media upload.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";

async function completeUploadedMedia({
  allowClosed,
  blob,
  candidateId,
  clientPayload,
  voteId,
}: {
  allowClosed: boolean;
  blob: CompletedBlob;
  candidateId: string;
  clientPayload: string | null | undefined;
  voteId: string;
}) {
  const payload = parseUploadPayload(clientPayload);
  assertPayloadMatchesRoute({
    candidateId,
    payload,
    voteId,
  });

  const { candidate } = await getUploadableCandidate({
    allowClosed,
    candidateId: payload.candidateId,
    voteId: payload.audienceVoteId,
  });
  const blobMetadata = await assertCompletedBlobMatchesPayload({
    blob,
    payload,
  });

  return audienceVoteService.completeVoteCandidateMediaUpload({
    mediaData: {
      blob_download_url: blobMetadata.downloadUrl,
      blob_pathname: blobMetadata.pathname,
      blob_url: blobMetadata.url,
      candidate_id: candidate.id,
      content_type: payload.contentType,
      file_name: payload.fileName,
      file_size_bytes: payload.sizeBytes,
      id: payload.mediaId,
      media_type: getVoteCandidateMediaTypeForContentType(payload.contentType),
    },
    replacesMediaId: payload.replacesMediaId ?? null,
  });
}
