-- Per-asset payment tracking.

CREATE TYPE "AssetPaymentStatus" AS ENUM ('unpaid', 'pending', 'paid');

ALTER TABLE "assets"
  ADD COLUMN "payment_status" "AssetPaymentStatus" NOT NULL DEFAULT 'unpaid',
  ADD COLUMN "paid_at" TIMESTAMPTZ;

CREATE INDEX "assets_payment_status_idx" ON "assets"("payment_status");
