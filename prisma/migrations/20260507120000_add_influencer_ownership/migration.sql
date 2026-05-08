-- Org-wide exclusive ownership lock on influencers.
-- New columns are nullable: existing rows stay unlocked (Q4(b)),
-- enforcement starts when new rows are created.

ALTER TABLE "influencers"
  ADD COLUMN "owner_id" UUID,
  ADD COLUMN "owned_at" TIMESTAMPTZ;

ALTER TABLE "influencers"
  ADD CONSTRAINT "influencers_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "influencers_owner_id_idx" ON "influencers"("owner_id");
