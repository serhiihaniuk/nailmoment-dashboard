import type { AudienceVote } from "@/shared/db/schema";
import {
  buildAudienceVoteOpeningBroadcastId,
  createAudienceVoteBroadcastService,
  type AudienceVoteBroadcastSummary,
} from "@/shared/db/service/audience-vote-broadcast-service";
import type { IAudienceVoteService } from "@/shared/db/service/audience-vote-service";
import { processAudienceVoteBroadcast } from "./broadcasts/broadcast-processor";
import { readAudienceVoteBroadcastOperatorTelegramUserIds } from "./broadcasts/operator-telegram-users";

type AudienceVoteBroadcastService = ReturnType<
  typeof createAudienceVoteBroadcastService
>;

export async function ensureAudienceVoteOpeningBroadcast({
  broadcastService,
  now = new Date(),
  vote,
}: {
  broadcastService: AudienceVoteBroadcastService;
  now?: Date;
  vote: AudienceVote;
}): Promise<AudienceVoteBroadcastSummary | undefined> {
  const messageText = vote.opening_broadcast_message_text?.trim();

  if (
    vote.archived ||
    vote.status !== "open" ||
    !messageText
  ) {
    return undefined;
  }

  const broadcast = await broadcastService.createAudienceVoteBroadcast({
    audience_vote_id: vote.id,
    broadcastId: buildAudienceVoteOpeningBroadcastId(vote.id),
    include_open_button: vote.opening_broadcast_include_open_button,
    message_text: messageText,
    now,
    operatorTelegramUserIds: readAudienceVoteBroadcastOperatorTelegramUserIds(),
  });

  if (!broadcast) {
    return undefined;
  }

  return (
    (await processAudienceVoteBroadcast({
      broadcastId: broadcast.id,
      now,
      service: broadcastService,
    })) ?? broadcast
  );
}

export async function ensureOpenAudienceVoteOpeningBroadcast({
  broadcastService,
  now = new Date(),
  voteService,
}: {
  broadcastService: AudienceVoteBroadcastService;
  now?: Date;
  voteService: IAudienceVoteService;
}): Promise<AudienceVoteBroadcastSummary | undefined> {
  const openVote = await voteService.getOpenAudienceVote();

  return openVote
    ? ensureAudienceVoteOpeningBroadcast({
        broadcastService,
        now,
        vote: openVote,
      })
    : undefined;
}
