/**
 * Idempotent seed script — safe to run multiple times.
 * Uses upserts so existing data is updated, not duplicated.
 *
 * Usage:
 *   npx tsx prisma/seed-idempotent.ts
 *   npm run db:seed
 *
 * This script:
 *   1. Creates/updates brands
 *   2. Creates/updates users (with hashed passwords)
 *   3. Creates/updates products
 *   4. Creates/updates payment terms
 *   5. Optionally seeds influencers + collaborations (dev/uat only)
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "development";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedAllowedDomains() {
  console.log("  → Seeding allowed domains...");
  const domains = ["marscosmetics.in"];

  for (const domain of domains) {
    await prisma.allowedDomain.upsert({
      where: { domain },
      update: { isActive: true },
      create: { domain, isActive: true, addedBy: "system" },
    });
  }
  console.log(`    ✓ ${domains.length} domains`);
}

async function seedBrands() {
  console.log("  → Seeding brands...");
  const brands = [
    { name: "MARS Cosmetics", slug: "mars-cosmetics", description: "Premium cosmetics and beauty products" },
    { name: "MARS Skincare", slug: "mars-skincare", description: "Skincare and wellness products" },
  ];

  const created = [];
  for (const brand of brands) {
    const result = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, description: brand.description },
      create: brand,
    });
    created.push(result);
  }
  console.log(`    ✓ ${created.length} brands`);
  return created;
}

async function seedUsers(brandIds: { cosmetics: string; skincare: string }) {
  console.log("  → Seeding users...");
  const passwordHash = await hash("admin123", 12);
  const userHash = await hash("user123", 12);

  const users = [
    { email: "admin@marscosmetics.in", name: "Admin User", password: passwordHash, role: "admin" as const, brandId: brandIds.cosmetics },
    { email: "manager@marscosmetics.in", name: "Marketing Manager", password: userHash, role: "manager" as const, brandId: brandIds.cosmetics },
    { email: "priya@marscosmetics.in", name: "Priya Sharma", password: userHash, role: "user" as const, brandId: brandIds.cosmetics },
    { email: "rahul@marscosmetics.in", name: "Rahul Verma", password: userHash, role: "user" as const, brandId: brandIds.skincare },
  ];

  const created = [];
  for (const user of users) {
    const result = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, brandId: user.brandId },
      create: user,
    });
    created.push(result);
  }
  console.log(`    ✓ ${created.length} users`);
  return created;
}

async function seedProducts(brandIds: { cosmetics: string; skincare: string }) {
  console.log("  → Seeding products...");
  const products = [
    { brandId: brandIds.cosmetics, name: "Matte Lipstick - Red Velvet", sku: "MARS-LIP-001", mrp: 499, category: "lipstick" },
    { brandId: brandIds.cosmetics, name: "Liquid Foundation - Natural Beige", sku: "MARS-FND-001", mrp: 799, category: "foundation" },
    { brandId: brandIds.cosmetics, name: "Kajal - Intense Black", sku: "MARS-KAJ-001", mrp: 299, category: "eyes" },
    { brandId: brandIds.skincare, name: "Vitamin C Serum", sku: "MARS-SKN-001", mrp: 999, category: "serum" },
    { brandId: brandIds.skincare, name: "Moisturizing Sunscreen SPF 50", sku: "MARS-SKN-002", mrp: 699, category: "sunscreen" },
    { brandId: brandIds.cosmetics, name: "Compact Powder - Ivory", sku: "MARS-CMP-001", mrp: 399, category: "face" },
    { brandId: brandIds.cosmetics, name: "Lip Gloss - Berry Blush", sku: "MARS-GLO-001", mrp: 349, category: "lips" },
    { brandId: brandIds.skincare, name: "Niacinamide Serum", sku: "MARS-SKN-003", mrp: 599, category: "serum" },
  ];

  let count = 0;
  for (const product of products) {
    if (product.sku) {
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: { name: product.name, mrp: product.mrp, category: product.category, brandId: product.brandId },
        create: { ...product, isActive: true },
      });
    } else {
      await prisma.product.create({ data: { ...product, isActive: true } });
    }
    count++;
  }
  console.log(`    ✓ ${count} products`);
}

async function seedPaymentTerms() {
  console.log("  → Seeding payment terms...");
  const terms = [
    {
      name: "100% Advance",
      description: "Full payment before content creation",
      installments: [{ percentage: 100, trigger: "on_confirmation", label: "Full Payment" }],
      isDefault: true,
    },
    {
      name: "50-50 Split",
      description: "Half on confirmation, half on content approval",
      installments: [
        { percentage: 50, trigger: "on_confirmation", label: "Advance" },
        { percentage: 50, trigger: "on_content_approval", label: "Balance" },
      ],
    },
    {
      name: "30-70 Split",
      description: "30% advance, 70% on content approval",
      installments: [
        { percentage: 30, trigger: "on_confirmation", label: "Advance" },
        { percentage: 70, trigger: "on_content_approval", label: "Balance" },
      ],
    },
    {
      name: "100% On Completion",
      description: "Full payment after content is approved",
      installments: [{ percentage: 100, trigger: "on_content_approval", label: "Full Payment" }],
    },
    {
      name: "Net 30",
      description: "Full payment 30 days after content approval",
      installments: [{ percentage: 100, trigger: "net_30", label: "Full Payment (Net 30)" }],
    },
    {
      name: "Three-Way Split",
      description: "Equal payments at confirmation, submission, and approval",
      installments: [
        { percentage: 33, trigger: "on_confirmation", label: "First Installment" },
        { percentage: 34, trigger: "on_content_submission", label: "Second Installment" },
        { percentage: 33, trigger: "on_content_approval", label: "Final Installment" },
      ],
    },
  ];

  let count = 0;
  for (const term of terms) {
    await prisma.paymentTerm.upsert({
      where: { name: term.name },
      update: { description: term.description, installments: term.installments },
      create: term,
    });
    count++;
  }
  console.log(`    ✓ ${count} payment terms`);
}

async function seedTestInfluencers(adminId: string, userId: string) {
  if (APP_ENV === "production") {
    console.log("  → Skipping test influencers (production)");
    return;
  }

  console.log("  → Seeding test influencers (dev/uat only)...");
  const influencers = [
    {
      name: "Ananya Mishra",
      email: "ananya@gmail.com",
      instagramHandle: "ananya_beauty",
      gender: "female" as const,
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      tier: "mid" as const,
      categories: ["beauty", "skincare", "lifestyle"],
      languages: ["hindi", "english"],
      primaryLanguage: "hindi",
      igFollowerCount: 250000,
      igEngagementRate: 4.5,
      igAvgReelViews: 45000,
      source: "manual_discovery",
      status: "active",
      addressLine1: "123, Andheri West",
      pincode: "400058",
      createdBy: adminId,
    },
    {
      name: "Riya Kapoor",
      email: "riya.kapoor@gmail.com",
      instagramHandle: "riyakapoor_style",
      gender: "female" as const,
      city: "Delhi",
      state: "Delhi",
      country: "India",
      tier: "macro" as const,
      categories: ["fashion", "beauty"],
      languages: ["english", "hindi"],
      primaryLanguage: "english",
      igFollowerCount: 820000,
      igEngagementRate: 3.2,
      igAvgReelViews: 120000,
      source: "instagram_dm",
      status: "active",
      addressLine1: "45, Connaught Place",
      pincode: "110001",
      panNumber: "ABCDE1234F",
      createdBy: adminId,
    },
    {
      name: "Sneha Patel",
      email: "sneha.patel@gmail.com",
      instagramHandle: "sneha_skincare",
      gender: "female" as const,
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      tier: "nano" as const,
      categories: ["skincare", "wellness"],
      languages: ["english", "kannada"],
      igFollowerCount: 8500,
      igEngagementRate: 7.2,
      source: "google_form",
      status: "onboarded",
      createdBy: userId,
    },
    {
      name: "Vikram Singh",
      email: "vikram@gmail.com",
      instagramHandle: "vikram_grooming",
      gender: "male" as const,
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      tier: "micro" as const,
      categories: ["grooming", "lifestyle"],
      languages: ["hindi", "english"],
      igFollowerCount: 35000,
      igEngagementRate: 5.8,
      source: "referral",
      status: "active",
      addressLine1: "78, C-Scheme",
      pincode: "302001",
      createdBy: userId,
    },
    {
      name: "Pooja Reddy",
      instagramHandle: "pooja_glow",
      gender: "female" as const,
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      tier: "micro" as const,
      categories: ["beauty", "skincare"],
      languages: ["telugu", "english"],
      igFollowerCount: 28000,
      igEngagementRate: 6.1,
      source: "email",
      status: "discovered",
      createdBy: userId,
    },
  ];

  let count = 0;
  for (const inf of influencers) {
    const existing = await prisma.influencer.findFirst({
      where: { instagramHandle: inf.instagramHandle },
    });
    if (!existing) {
      await prisma.influencer.create({ data: inf });
      count++;
    }
  }
  console.log(`    ✓ ${count} new influencers (${influencers.length - count} already existed)`);
}

async function main() {
  console.log(`\n🌱 Seeding MARS IMS [${APP_ENV.toUpperCase()}]\n`);

  // 0. Allowed domains
  await seedAllowedDomains();

  // 1. Core data (all environments)
  const [cosmeticsBrand, skincareBrand] = await seedBrands();
  const brandIds = { cosmetics: cosmeticsBrand.id, skincare: skincareBrand.id };

  const users = await seedUsers(brandIds);
  const admin = users.find((u) => u.role === "admin")!;
  const user1 = users.find((u) => u.email === "priya@marscosmetics.in")!;

  await seedProducts(brandIds);
  await seedPaymentTerms();

  // 2. Test data (dev/uat only)
  await seedTestInfluencers(admin.id, user1.id);

  console.log(`\n✅ Seed complete!\n`);
  console.log("Login credentials:");
  console.log("  Admin:   admin@marscosmetics.in / admin123");
  console.log("  Manager: manager@marscosmetics.in / user123");
  console.log("  User 1:  priya@marscosmetics.in / user123");
  console.log("  User 2:  rahul@marscosmetics.in / user123\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
