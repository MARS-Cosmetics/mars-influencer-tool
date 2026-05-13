-- In-app notifications. One row per recipient; fan-out done at write time
-- so the read query is a cheap composite-index lookup.

CREATE TYPE "NotificationType" AS ENUM (
  'proposal_submitted',
  'proposal_approved',
  'proposal_rejected',
  'proposal_counter_offered',
  'proposal_accepted_by_influencer',
  'deal_locked'
);

CREATE TABLE "notifications" (
  "id"           UUID             NOT NULL DEFAULT gen_random_uuid(),
  "recipient_id" UUID             NOT NULL,
  "type"         "NotificationType" NOT NULL,
  "title"        TEXT             NOT NULL,
  "body"         TEXT,
  "action_url"   TEXT             NOT NULL,
  "entity_type"  TEXT,
  "entity_id"    UUID,
  "read_at"      TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_recipient_id_fkey"
    FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "notifications_recipient_id_read_at_created_at_idx"
  ON "notifications"("recipient_id", "read_at", "created_at");
