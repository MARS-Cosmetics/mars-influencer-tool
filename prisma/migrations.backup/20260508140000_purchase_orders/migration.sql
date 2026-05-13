-- Vendor code on Influencer — generated on first PO, reused thereafter.
ALTER TABLE "influencers" ADD COLUMN "vendor_code" TEXT;
CREATE UNIQUE INDEX "influencers_vendor_code_key" ON "influencers"("vendor_code");

-- Purchase Orders table.
CREATE TABLE "purchase_orders" (
  "id"                       UUID         NOT NULL DEFAULT gen_random_uuid(),
  "po_number"                TEXT         NOT NULL,
  "fiscal_year"              TEXT         NOT NULL,
  "sequence"                 INTEGER      NOT NULL,
  "pr_parcel_id"             UUID,
  "collaboration_id"         UUID         NOT NULL,
  "influencer_id"            UUID         NOT NULL,
  "brand_id"                 UUID         NOT NULL,
  "vendor_code_snapshot"     TEXT         NOT NULL,
  "vendor_name_snapshot"     TEXT         NOT NULL,
  "vendor_pan_snapshot"      TEXT,
  "vendor_gstin_snapshot"    TEXT,
  "vendor_address_snapshot"  TEXT,
  "vendor_state_snapshot"    TEXT,
  "vendor_pincode_snapshot"  TEXT,
  "vendor_phone_snapshot"    TEXT,
  "line_item_description"    TEXT         NOT NULL DEFAULT 'PROFESSIONAL FEES',
  "hsn_code"                 TEXT         NOT NULL DEFAULT '998361',
  "quantity"                 INTEGER      NOT NULL DEFAULT 1,
  "base_price"               DECIMAL(12, 2) NOT NULL,
  "tax_rate"                 DECIMAL(5, 2) NOT NULL,
  "igst_amount"              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "cgst_amount"              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "sgst_amount"              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "taxable_amount"           DECIMAL(12, 2) NOT NULL,
  "total_tax"                DECIMAL(12, 2) NOT NULL,
  "round_off"                DECIMAL(8, 2) NOT NULL DEFAULT 0,
  "grand_total"              DECIMAL(12, 2) NOT NULL,
  "po_date"                  DATE         NOT NULL DEFAULT CURRENT_DATE,
  "created_at"               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "generated_by"             UUID,

  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");
CREATE UNIQUE INDEX "purchase_orders_pr_parcel_id_key" ON "purchase_orders"("pr_parcel_id");
CREATE INDEX "purchase_orders_fiscal_year_sequence_idx" ON "purchase_orders"("fiscal_year", "sequence");
CREATE INDEX "purchase_orders_collaboration_id_idx" ON "purchase_orders"("collaboration_id");
CREATE INDEX "purchase_orders_influencer_id_idx" ON "purchase_orders"("influencer_id");

ALTER TABLE "purchase_orders"
  ADD CONSTRAINT "purchase_orders_pr_parcel_id_fkey"
    FOREIGN KEY ("pr_parcel_id") REFERENCES "pr_parcels"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "purchase_orders_collaboration_id_fkey"
    FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id"),
  ADD CONSTRAINT "purchase_orders_influencer_id_fkey"
    FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id"),
  ADD CONSTRAINT "purchase_orders_brand_id_fkey"
    FOREIGN KEY ("brand_id") REFERENCES "brands"("id");
