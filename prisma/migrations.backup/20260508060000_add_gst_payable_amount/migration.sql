-- GST + payable amount on collaborations.
-- Both nullable: existing rows continue to work, payableAmount is filled
-- when the user explicitly sets a GST rate on a deal.

ALTER TABLE "collaborations"
  ADD COLUMN "gst_pct" DECIMAL(5, 2),
  ADD COLUMN "payable_amount" DECIMAL(12, 2);
