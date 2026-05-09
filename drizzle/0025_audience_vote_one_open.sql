CREATE UNIQUE INDEX IF NOT EXISTS "audience_vote_one_open_active_idx"
  ON "audience_vote" ("status")
  WHERE "status" = 'open' AND "archived" = false;
