-- Iterative negotiation: each row = one round of handler proposal + admin review.
-- Separate from Collaboration.approvalStatus (which is the final go/no-go).

CREATE TYPE "ProposalStatus" AS ENUM (
  'pending_review',
  'approved',
  'rejected',
  'counter_offered',
  'accepted_by_influencer',
  'superseded'
);

CREATE TABLE "collaboration_proposals" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "collaboration_id"    UUID         NOT NULL,

  "submitted_by"        UUID         NOT NULL,
  "submitted_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "proposed_amount"     DECIMAL(12,2),
  "proposed_gst_pct"    DECIMAL(5,2),
  "proposed_due_date"   DATE,
  "proposed_terms"      TEXT,
  "influencer_response" TEXT,

  "status"            "ProposalStatus" NOT NULL DEFAULT 'pending_review',
  "reviewed_by"       UUID,
  "reviewed_at"       TIMESTAMPTZ,
  "counter_amount"    DECIMAL(12,2),
  "counter_gst_pct"   DECIMAL(5,2),
  "counter_due_date"  DATE,
  "review_notes"      TEXT,

  CONSTRAINT "collaboration_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collaboration_proposals_collaboration_id_fkey"
    FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id"),
  CONSTRAINT "collaboration_proposals_submitted_by_fkey"
    FOREIGN KEY ("submitted_by") REFERENCES "users"("id"),
  CONSTRAINT "collaboration_proposals_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
);

CREATE INDEX "collaboration_proposals_collaboration_id_submitted_at_idx"
  ON "collaboration_proposals"("collaboration_id", "submitted_at");
CREATE INDEX "collaboration_proposals_status_idx"
  ON "collaboration_proposals"("status");

-- Deal-lock signal on Collaboration. Independent of `status` enum so we don't
-- break the existing state machine. Handler sets this; admin sees the flag.
ALTER TABLE "collaborations"
  ADD COLUMN "deal_locked_at" TIMESTAMPTZ,
  ADD COLUMN "deal_locked_by" UUID,
  ADD CONSTRAINT "collaborations_deal_locked_by_fkey"
    FOREIGN KEY ("deal_locked_by") REFERENCES "users"("id");
