-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled', 'invoice_issue');

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

-- CreateEnum
CREATE TYPE "AssetPaymentStatus" AS ENUM ('unpaid', 'pending', 'paid');

-- CreateEnum
CREATE TYPE "BookmarkStatus" AS ENUM ('new', 'contacted', 'responded', 'shortlisted', 'declined', 'rejected');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SuggestionSource" AS ENUM ('telegram', 'manual');

-- CreateEnum
CREATE TYPE "TelegramSessionState" AS ENUM ('idle', 'awaiting_link', 'awaiting_assignee', 'awaiting_note');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('active', 'superseded', 'revoked', 'deleted');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "DocumentAccessAction" AS ENUM ('view', 'download', 'denied', 'revoked');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('proposal_submitted', 'proposal_approved', 'proposal_rejected', 'proposal_counter_offered', 'proposal_accepted_by_influencer', 'deal_locked');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'counter_offered', 'accepted_by_influencer', 'superseded');

-- CreateTable
CREATE TABLE "allowed_domains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowed_domains_pkey" PRIMARY KEY ("id")
);

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
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "last_password_change" TIMESTAMPTZ,
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
    "shopify_store_url" TEXT,
    "shopify_access_token" TEXT,
    "shopify_api_version" TEXT DEFAULT '2024-10',
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
    "vendor_code" TEXT,
    "tags" TEXT[],
    "internal_notes" TEXT,
    "platform_analytics" JSONB,
    "metadata" JSONB,
    "culturex_profile_id" TEXT,
    "metrics_last_synced_at" TIMESTAMPTZ,
    "owner_id" UUID,
    "owned_at" TIMESTAMPTZ,
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
    "gst_pct" DECIMAL(5,2),
    "payable_amount" DECIMAL(12,2),
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
    "deal_locked_at" TIMESTAMPTZ,
    "deal_locked_by" UUID,
    "content_rating" DECIMAL(2,1),
    "rating_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "requires_content_approval" BOOLEAN NOT NULL DEFAULT true,

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
    "notes" TEXT,
    "shopify_order_id" TEXT,
    "shopify_order_number" TEXT,
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
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_number" TEXT NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "pr_parcel_id" UUID,
    "collaboration_id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "vendor_code_snapshot" TEXT NOT NULL,
    "vendor_name_snapshot" TEXT NOT NULL,
    "vendor_pan_snapshot" TEXT,
    "vendor_gstin_snapshot" TEXT,
    "vendor_address_snapshot" TEXT,
    "vendor_state_snapshot" TEXT,
    "vendor_pincode_snapshot" TEXT,
    "vendor_phone_snapshot" TEXT,
    "line_item_description" TEXT NOT NULL DEFAULT 'PROFESSIONAL FEES',
    "hsn_code" TEXT NOT NULL DEFAULT '998361',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "base_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "igst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(12,2) NOT NULL,
    "total_tax" DECIMAL(12,2) NOT NULL,
    "round_off" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL,
    "po_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" UUID,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
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
    "brightdata_snapshot" JSONB,
    "brightdata_synced_at" TIMESTAMPTZ,
    "payment_status" "AssetPaymentStatus" NOT NULL DEFAULT 'unpaid',
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asset_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "feedback" TEXT,
    "reviewed_by" UUID,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ,

    CONSTRAINT "asset_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_transitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaboration_id" UUID NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "changed_by" UUID,
    "auto_actions_executed" JSONB,
    "auto_action_errors" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_transitions_pkey" PRIMARY KEY ("id")
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
    "pincode" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "commission_pct" DECIMAL(5,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "business_type" TEXT,
    "years_in_business" INTEGER,
    "annual_turnover" TEXT,
    "director_name" TEXT,
    "director_aadhar" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc" TEXT,
    "bank_branch" TEXT,
    "bank_account_type" TEXT,
    "pan_document_url" TEXT,
    "gst_document_url" TEXT,
    "udhyam_certificate_url" TEXT,
    "agency_roster_url" TEXT,
    "aadhar_document_url" TEXT,
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
    "user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "description" TEXT,
    "changes" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_bookmarks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "external_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profile_snapshot" JSONB NOT NULL,
    "note" TEXT,
    "status" "BookmarkStatus" NOT NULL DEFAULT 'new',
    "status_updated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencer_searches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "user_prompt" TEXT NOT NULL,
    "generated_filter" JSONB NOT NULL,
    "result_count" INTEGER NOT NULL,
    "credits_balance" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "influencer_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencer_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "SuggestionSource" NOT NULL DEFAULT 'telegram',
    "telegram_user_id" TEXT,
    "telegram_username" TEXT,
    "submitted_by_name" TEXT,
    "platform" TEXT NOT NULL,
    "profile_url" TEXT NOT NULL,
    "handle" TEXT,
    "note" TEXT,
    "assigned_to_user_id" UUID NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'pending',
    "reviewer_note" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by_user_id" UUID,
    "promoted_influencer_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "influencer_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_sessions" (
    "chat_id" TEXT NOT NULL,
    "state" "TelegramSessionState" NOT NULL DEFAULT 'idle',
    "draft_platform" TEXT,
    "draft_profile_url" TEXT,
    "draft_handle" TEXT,
    "draft_assignee_id" UUID,
    "telegram_user_id" TEXT,
    "telegram_username" TEXT,
    "first_name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "telegram_sessions_pkey" PRIMARY KEY ("chat_id")
);

-- CreateTable
CREATE TABLE "document_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DocumentStatus" NOT NULL DEFAULT 'active',
    "superseded_by" UUID,
    "superseded_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "verification_status" "DocumentVerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,

    CONSTRAINT "document_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "document_access_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "user_id" UUID,
    "action" "DocumentAccessAction" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "action_url" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaboration_id" UUID NOT NULL,
    "submitted_by" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposed_amount" DECIMAL(12,2),
    "proposed_gst_pct" DECIMAL(5,2),
    "proposed_due_date" DATE,
    "proposed_terms" TEXT,
    "influencer_response" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'pending_review',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "counter_amount" DECIMAL(12,2),
    "counter_gst_pct" DECIMAL(5,2),
    "counter_due_date" DATE,
    "review_notes" TEXT,

    CONSTRAINT "collaboration_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowed_domains_domain_key" ON "allowed_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_instagram_handle_key" ON "influencers"("instagram_handle");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_vendor_code_key" ON "influencers"("vendor_code");

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
CREATE INDEX "influencers_owner_id_idx" ON "influencers"("owner_id");

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
CREATE UNIQUE INDEX "products_shopify_variant_id_key" ON "products"("shopify_variant_id");

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
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_pr_parcel_id_key" ON "purchase_orders"("pr_parcel_id");

-- CreateIndex
CREATE INDEX "purchase_orders_fiscal_year_sequence_idx" ON "purchase_orders"("fiscal_year", "sequence");

-- CreateIndex
CREATE INDEX "purchase_orders_collaboration_id_idx" ON "purchase_orders"("collaboration_id");

-- CreateIndex
CREATE INDEX "purchase_orders_influencer_id_idx" ON "purchase_orders"("influencer_id");

-- CreateIndex
CREATE INDEX "assets_is_viral_idx" ON "assets"("is_viral");

-- CreateIndex
CREATE INDEX "assets_collaboration_id_idx" ON "assets"("collaboration_id");

-- CreateIndex
CREATE INDEX "assets_influencer_id_created_at_idx" ON "assets"("influencer_id", "created_at");

-- CreateIndex
CREATE INDEX "assets_is_viral_viral_detected_at_idx" ON "assets"("is_viral", "viral_detected_at");

-- CreateIndex
CREATE INDEX "assets_published_at_status_idx" ON "assets"("published_at", "status");

-- CreateIndex
CREATE INDEX "assets_payment_status_idx" ON "assets"("payment_status");

-- CreateIndex
CREATE INDEX "asset_revisions_asset_id_idx" ON "asset_revisions"("asset_id");

-- CreateIndex
CREATE INDEX "status_transitions_collaboration_id_idx" ON "status_transitions"("collaboration_id");

-- CreateIndex
CREATE INDEX "status_transitions_to_status_created_at_idx" ON "status_transitions"("to_status", "created_at");

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

-- CreateIndex
CREATE INDEX "activity_log_created_at_idx" ON "activity_log"("created_at");

-- CreateIndex
CREATE INDEX "activity_log_user_id_created_at_idx" ON "activity_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "discovery_bookmarks_campaign_id_idx" ON "discovery_bookmarks"("campaign_id");

-- CreateIndex
CREATE INDEX "discovery_bookmarks_user_id_idx" ON "discovery_bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "discovery_bookmarks_status_idx" ON "discovery_bookmarks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_bookmarks_campaign_id_platform_external_user_id_key" ON "discovery_bookmarks"("campaign_id", "platform", "external_user_id");

-- CreateIndex
CREATE INDEX "influencer_searches_campaign_id_created_at_idx" ON "influencer_searches"("campaign_id", "created_at");

-- CreateIndex
CREATE INDEX "influencer_searches_user_id_created_at_idx" ON "influencer_searches"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "influencer_suggestions_assigned_to_user_id_status_idx" ON "influencer_suggestions"("assigned_to_user_id", "status");

-- CreateIndex
CREATE INDEX "influencer_suggestions_status_created_at_idx" ON "influencer_suggestions"("status", "created_at");

-- CreateIndex
CREATE INDEX "influencer_suggestions_telegram_user_id_idx" ON "influencer_suggestions"("telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_records_storage_key_key" ON "document_records"("storage_key");

-- CreateIndex
CREATE INDEX "document_records_entity_type_entity_id_document_type_status_idx" ON "document_records"("entity_type", "entity_id", "document_type", "status");

-- CreateIndex
CREATE INDEX "document_records_uploaded_by_idx" ON "document_records"("uploaded_by");

-- CreateIndex
CREATE INDEX "document_records_status_idx" ON "document_records"("status");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets"("reset_at");

-- CreateIndex
CREATE INDEX "document_access_log_document_id_accessed_at_idx" ON "document_access_log"("document_id", "accessed_at");

-- CreateIndex
CREATE INDEX "document_access_log_user_id_accessed_at_idx" ON "document_access_log"("user_id", "accessed_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_created_at_idx" ON "notifications"("recipient_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "collaboration_proposals_collaboration_id_submitted_at_idx" ON "collaboration_proposals"("collaboration_id", "submitted_at");

-- CreateIndex
CREATE INDEX "collaboration_proposals_status_idx" ON "collaboration_proposals"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_deal_locked_by_fkey" FOREIGN KEY ("deal_locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pr_parcel_id_fkey" FOREIGN KEY ("pr_parcel_id") REFERENCES "pr_parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_revisions" ADD CONSTRAINT "asset_revisions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_revisions" ADD CONSTRAINT "asset_revisions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_bookmarks" ADD CONSTRAINT "discovery_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_bookmarks" ADD CONSTRAINT "discovery_bookmarks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_searches" ADD CONSTRAINT "influencer_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_searches" ADD CONSTRAINT "influencer_searches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_suggestions" ADD CONSTRAINT "influencer_suggestions_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_suggestions" ADD CONSTRAINT "influencer_suggestions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_suggestions" ADD CONSTRAINT "influencer_suggestions_promoted_influencer_id_fkey" FOREIGN KEY ("promoted_influencer_id") REFERENCES "influencers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_proposals" ADD CONSTRAINT "collaboration_proposals_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_proposals" ADD CONSTRAINT "collaboration_proposals_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_proposals" ADD CONSTRAINT "collaboration_proposals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

