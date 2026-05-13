-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'user');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'non_binary', 'other');

-- CreateEnum
CREATE TYPE "InfluencerTier" AS ENUM ('nano', 'micro', 'mid', 'macro', 'mega');

-- CreateEnum
CREATE TYPE "InfluencerSource" AS ENUM ('google_form', 'instagram_dm', 'email', 'manual_discovery', 'inbound', 'referral', 'agency', 'event');

-- CreateEnum
CREATE TYPE "InfluencerStatus" AS ENUM ('discovered', 'contacted', 'form_submitted', 'demographics_verified', 'onboarded', 'active', 'inactive', 'blacklisted', 'do_not_contact');

-- CreateEnum
CREATE TYPE "PaymentPreference" AS ENUM ('bank_transfer', 'upi', 'other');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CollaborationType" AS ENUM ('paid', 'barter', 'pr_gifting');

-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('draft', 'outreach', 'negotiation', 'confirmed', 'in_progress', 'content_submitted', 'content_approved', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'youtube', 'twitter', 'linkedin', 'blog', 'other');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('reel', 'static_post', 'carousel', 'video', 'short', 'tweet', 'article', 'other');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('pending', 'submitted', 'approved', 'revision_requested', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('preparing', 'shipped', 'in_transit', 'delivered', 'returned');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank_transfer', 'upi', 'razorpay', 'other');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('received', 'verified', 'approved', 'paid', 'disputed', 'cancelled');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('exclusivity', 'brand_ambassador', 'retainer', 'one_time', 'nda');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'sent', 'signed', 'active', 'expired', 'terminated');

-- CreateEnum
CREATE TYPE "ContentIdeaStatus" AS ENUM ('idea', 'approved', 'briefed', 'in_production', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('auto_approved', 'pending_approval', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentTrigger" AS ENUM ('on_confirmation', 'on_content_submission', 'on_content_approval', 'on_publication', 'on_completion', 'net_15', 'net_30', 'net_45', 'custom');

-- CreateEnum
CREATE TYPE "ContentIdeaPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ContentTheme" AS ENUM ('festival', 'launch', 'tutorial', 'grwm', 'haul', 'review', 'unboxing', 'challenge', 'collab', 'seasonal', 'trending', 'educational', 'behind_the_scenes', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "avatar_url" TEXT,
    "brand_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "approval_limit" DECIMAL(12,2),
    "manager_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp_number" TEXT,
    "date_of_birth" DATE,
    "gender" "Gender",
    "bio" TEXT,
    "profile_image_url" TEXT,
    "instagram_handle" TEXT,
    "instagram_id" TEXT,
    "youtube_handle" TEXT,
    "youtube_channel_id" TEXT,
    "twitter_handle" TEXT,
    "linkedin_url" TEXT,
    "blog_url" TEXT,
    "tiktok_handle" TEXT,
    "snapchat_handle" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT DEFAULT 'India',
    "tier" "InfluencerTier",
    "categories" TEXT[],
    "content_niches" TEXT[],
    "languages" TEXT[],
    "primary_language" TEXT,
    "ig_access_token" TEXT,
    "ig_follower_count" INTEGER,
    "ig_following_count" INTEGER,
    "ig_post_count" INTEGER,
    "ig_engagement_rate" DECIMAL(5,2),
    "ig_avg_likes" INTEGER,
    "ig_avg_comments" INTEGER,
    "ig_avg_reel_views" INTEGER,
    "ig_avg_story_views" INTEGER,
    "ig_last_8_reel_views" INTEGER[],
    "ig_median_reel_views" INTEGER,
    "ig_audience_male_pct" DECIMAL(5,2),
    "ig_audience_female_pct" DECIMAL(5,2),
    "ig_audience_top_age_range" TEXT,
    "ig_audience_age_breakdown" JSONB,
    "ig_audience_top_cities" JSONB,
    "ig_audience_top_countries" JSONB,
    "ig_audience_language_split" JSONB,
    "ig_credibility_score" DECIMAL(5,2),
    "yt_subscriber_count" INTEGER,
    "yt_total_views" INTEGER,
    "yt_avg_views" INTEGER,
    "yt_engagement_rate" DECIMAL(5,2),
    "yt_last_8_video_views" INTEGER[],
    "yt_median_video_views" INTEGER,
    "yt_audience_male_pct" DECIMAL(5,2),
    "yt_audience_female_pct" DECIMAL(5,2),
    "yt_audience_age_breakdown" JSONB,
    "yt_audience_top_countries" JSONB,
    "social_score" DECIMAL(5,2),
    "brand_affinity_score" DECIMAL(5,2),
    "content_quality_score" DECIMAL(5,2),
    "reliability_score" DECIMAL(5,2),
    "past_collab_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "pan_number" TEXT,
    "gstin" TEXT,
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc_code" TEXT,
    "bank_name" TEXT,
    "upi_id" TEXT,
    "payment_preference" "PaymentPreference" DEFAULT 'bank_transfer',
    "rate_instagram_reel" DECIMAL(10,2),
    "rate_instagram_story" DECIMAL(10,2),
    "rate_instagram_post" DECIMAL(10,2),
    "rate_youtube_video" DECIMAL(10,2),
    "rate_youtube_short" DECIMAL(10,2),
    "rate_blog_post" DECIMAL(10,2),
    "rate_twitter_post" DECIMAL(10,2),
    "rate_currency" TEXT DEFAULT 'INR',
    "rate_notes" TEXT,
    "source" "InfluencerSource",
    "referred_by" TEXT,
    "agency_id" UUID,
    "managed_by" TEXT DEFAULT 'self',
    "status" "InfluencerStatus" NOT NULL DEFAULT 'discovered',
    "onboarded_at" TIMESTAMPTZ,
    "blacklist_reason" TEXT,
    "tags" TEXT[],
    "internal_notes" TEXT,
    "platform_analytics" JSONB,
    "metadata" JSONB,
    "culturex_profile_id" TEXT,
    "metrics_last_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "total_budget" DECIMAL(12,2),
    "spent_budget" DECIMAL(12,2) DEFAULT 0,
    "currency" TEXT DEFAULT 'INR',
    "start_date" DATE,
    "end_date" DATE,
    "goals" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "influencer_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "campaign_id" UUID,
    "assigned_to" UUID NOT NULL,
    "type" "CollaborationType" NOT NULL,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'draft',
    "agreed_amount" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'INR',
    "payment_term_id" UUID,
    "platform" "Platform",
    "content_type" "ContentType",
    "deliverable_count" INTEGER,
    "deliverables" JSONB,
    "brief" TEXT,
    "shopify_order_id" TEXT,
    "shopify_order_number" TEXT,
    "shopify_order_status" TEXT,
    "shopify_tracking_id" TEXT,
    "shopify_tracking_url" TEXT,
    "shopify_fulfillment_status" TEXT,
    "shopify_last_sync_at" TIMESTAMPTZ,
    "due_date" DATE,
    "agency_id" UUID,
    "agency_name_snapshot" TEXT,
    "agency_commission_pct" DECIMAL(5,2),
    "approval_status" "ApprovalStatus" DEFAULT 'auto_approved',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "approval_notes" TEXT,
    "content_rating" DECIMAL(2,1),
    "rating_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "mrp" DECIMAL(10,2),
    "image_url" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "shopify_product_id" TEXT,
    "shopify_variant_id" TEXT,
    "shopify_inventory_item_id" TEXT,
    "inventory_quantity" INTEGER,
    "shopify_image_url" TEXT,
    "shopify_last_sync_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaboration_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_parcels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "influencer_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "collaboration_id" UUID,
    "shipping_address" TEXT,
    "courier_name" TEXT,
    "tracking_number" TEXT,
    "status" "ParcelStatus" NOT NULL DEFAULT 'preparing',
    "shipped_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "shopify_order_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "pr_parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_parcel_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pr_parcel_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pr_parcel_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaboration_id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_url" TEXT,
    "file_url" TEXT,
    "thumbnail_url" TEXT,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "reach" INTEGER,
    "impressions" INTEGER,
    "content_rating" DECIMAL(2,1),
    "rating_tags" TEXT[],
    "rating_notes" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'pending',
    "due_date" DATE,
    "published_at" TIMESTAMPTZ,
    "has_ad_rights" BOOLEAN NOT NULL DEFAULT false,
    "is_viral" BOOLEAN NOT NULL DEFAULT false,
    "viral_multiplier" DECIMAL(6,2),
    "peak_views" INTEGER,
    "metrics_snapshot" JSONB,
    "baseline_metrics" JSONB,
    "viral_detected_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaboration_id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "invoice_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT DEFAULT 'INR',
    "tds_percentage" DECIMAL(4,2),
    "tds_amount" DECIMAL(12,2),
    "net_amount" DECIMAL(12,2),
    "payment_method" "PaymentMethod",
    "transaction_ref" TEXT,
    "trigger" "PaymentTrigger",
    "installment_label" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ,
    "agency_id" UUID,
    "agency_commission_pct" DECIMAL(5,2),
    "agency_commission_amount" DECIMAL(12,2),
    "bc_entry_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "approved_by" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaboration_id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT DEFAULT 'INR',
    "file_url" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'received',
    "bc_invoice_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "verified_by" UUID,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "influencer_id" UUID NOT NULL,
    "brand_id" UUID,
    "collaboration_id" UUID,
    "contract_type" "ContractType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "contract_value" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'INR',
    "payment_terms" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "signed_at" TIMESTAMPTZ,
    "expiry_alert_days" INTEGER DEFAULT 30,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "commission_pct" DECIMAL(5,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "installments" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_ideas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "theme" "ContentTheme" NOT NULL DEFAULT 'other',
    "platform" "Platform",
    "content_type" "ContentType",
    "status" "ContentIdeaStatus" NOT NULL DEFAULT 'idea',
    "priority" "ContentIdeaPriority" DEFAULT 'medium',
    "brand_id" UUID,
    "campaign_id" UUID,
    "collaboration_id" UUID,
    "influencer_id" UUID,
    "reference_urls" TEXT[],
    "moodboard_url" TEXT,
    "notes" TEXT,
    "target_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggered_by" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "items_processed" INTEGER,
    "items_created" INTEGER,
    "items_updated" INTEGER,
    "items_failed" INTEGER,
    "error_message" TEXT,
    "details" JSONB,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_instagram_handle_key" ON "influencers"("instagram_handle");

-- CreateIndex
CREATE INDEX "influencers_instagram_handle_idx" ON "influencers"("instagram_handle");

-- CreateIndex
CREATE INDEX "influencers_tier_idx" ON "influencers"("tier");

-- CreateIndex
CREATE INDEX "influencers_status_idx" ON "influencers"("status");

-- CreateIndex
CREATE INDEX "influencers_city_idx" ON "influencers"("city");

-- CreateIndex
CREATE INDEX "influencers_social_score_idx" ON "influencers"("social_score");

-- CreateIndex
CREATE INDEX "influencers_ig_follower_count_idx" ON "influencers"("ig_follower_count");

-- CreateIndex
CREATE INDEX "influencers_categories_idx" ON "influencers" USING GIN ("categories");

-- CreateIndex
CREATE INDEX "influencers_tags_idx" ON "influencers" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "collaborations_assigned_to_idx" ON "collaborations"("assigned_to");

-- CreateIndex
CREATE INDEX "collaborations_influencer_id_idx" ON "collaborations"("influencer_id");

-- CreateIndex
CREATE INDEX "collaborations_brand_id_idx" ON "collaborations"("brand_id");

-- CreateIndex
CREATE INDEX "collaborations_campaign_id_idx" ON "collaborations"("campaign_id");

-- CreateIndex
CREATE INDEX "collaborations_status_idx" ON "collaborations"("status");

-- CreateIndex
CREATE INDEX "collaborations_agency_id_idx" ON "collaborations"("agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "collaboration_products_collaboration_id_idx" ON "collaboration_products"("collaboration_id");

-- CreateIndex
CREATE INDEX "collaboration_products_product_id_idx" ON "collaboration_products"("product_id");

-- CreateIndex
CREATE INDEX "pr_parcels_influencer_id_idx" ON "pr_parcels"("influencer_id");

-- CreateIndex
CREATE INDEX "pr_parcels_brand_id_idx" ON "pr_parcels"("brand_id");

-- CreateIndex
CREATE INDEX "pr_parcel_items_pr_parcel_id_idx" ON "pr_parcel_items"("pr_parcel_id");

-- CreateIndex
CREATE INDEX "pr_parcel_items_product_id_idx" ON "pr_parcel_items"("product_id");

-- CreateIndex
CREATE INDEX "assets_is_viral_idx" ON "assets"("is_viral");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_collaboration_id_idx" ON "payments"("collaboration_id");

-- CreateIndex
CREATE INDEX "payments_agency_id_idx" ON "payments"("agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "contracts_influencer_id_idx" ON "contracts"("influencer_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_end_date_idx" ON "contracts"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terms_name_key" ON "payment_terms"("name");

-- CreateIndex
CREATE INDEX "content_ideas_brand_id_idx" ON "content_ideas"("brand_id");

-- CreateIndex
CREATE INDEX "content_ideas_campaign_id_idx" ON "content_ideas"("campaign_id");

-- CreateIndex
CREATE INDEX "content_ideas_status_idx" ON "content_ideas"("status");

-- CreateIndex
CREATE INDEX "content_ideas_theme_idx" ON "content_ideas"("theme");

-- CreateIndex
CREATE INDEX "sync_logs_sync_type_idx" ON "sync_logs"("sync_type");

-- CreateIndex
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_idx" ON "activity_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_log_user_id_idx" ON "activity_log"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_payment_term_id_fkey" FOREIGN KEY ("payment_term_id") REFERENCES "payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_products" ADD CONSTRAINT "collaboration_products_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_products" ADD CONSTRAINT "collaboration_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_parcels" ADD CONSTRAINT "pr_parcels_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_parcels" ADD CONSTRAINT "pr_parcels_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_parcels" ADD CONSTRAINT "pr_parcels_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_parcels" ADD CONSTRAINT "pr_parcels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_parcel_items" ADD CONSTRAINT "pr_parcel_items_pr_parcel_id_fkey" FOREIGN KEY ("pr_parcel_id") REFERENCES "pr_parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_parcel_items" ADD CONSTRAINT "pr_parcel_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
