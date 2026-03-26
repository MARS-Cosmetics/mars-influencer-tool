import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create brands
  const brand1 = await prisma.brand.create({
    data: {
      name: "MARS Cosmetics",
      slug: "mars-cosmetics",
      description: "Premium cosmetics and beauty products",
    },
  });

  const brand2 = await prisma.brand.create({
    data: {
      name: "MARS Skincare",
      slug: "mars-skincare",
      description: "Skincare and wellness products",
    },
  });

  console.log("Created brands");

  // Create users
  const adminPassword = await hash("admin123", 12);
  const userPassword = await hash("user123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@mars.com",
      name: "Admin User",
      password: adminPassword,
      role: "admin",
      brandId: brand1.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@mars.com",
      name: "Marketing Manager",
      password: userPassword,
      role: "manager",
      brandId: brand1.id,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: "priya@mars.com",
      name: "Priya Sharma",
      password: userPassword,
      role: "user",
      brandId: brand1.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "rahul@mars.com",
      name: "Rahul Verma",
      password: userPassword,
      role: "user",
      brandId: brand2.id,
    },
  });

  console.log("Created users");

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        brandId: brand1.id,
        name: "Matte Lipstick - Red Velvet",
        sku: "MARS-LIP-001",
        description: "Long-lasting matte lipstick in Red Velvet shade",
        mrp: 499,
        category: "lipstick",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        brandId: brand1.id,
        name: "Liquid Foundation - Natural Beige",
        sku: "MARS-FND-001",
        description: "Lightweight liquid foundation with SPF 30",
        mrp: 799,
        category: "foundation",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        brandId: brand1.id,
        name: "Kajal - Intense Black",
        sku: "MARS-KAJ-001",
        description: "Smudge-proof kajal pencil",
        mrp: 299,
        category: "eyes",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        brandId: brand2.id,
        name: "Vitamin C Serum",
        sku: "MARS-SKN-001",
        description: "Brightening vitamin C serum with hyaluronic acid",
        mrp: 999,
        category: "serum",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        brandId: brand2.id,
        name: "Moisturizing Sunscreen SPF 50",
        sku: "MARS-SKN-002",
        description: "Lightweight sunscreen with no white cast",
        mrp: 699,
        category: "sunscreen",
        isActive: true,
      },
    }),
  ]);

  console.log("Created products");

  // Create influencers
  const influencer1 = await prisma.influencer.create({
    data: {
      name: "Ananya Mishra",
      email: "ananya@gmail.com",
      phone: "+91-9876543210",
      instagramHandle: "ananya_beauty",
      youtubeHandle: "AnanyaBeautyVlogs",
      gender: "female",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      tier: "mid",
      categories: ["beauty", "skincare", "lifestyle"],
      contentNiches: ["GRWM", "reviews", "tutorials"],
      languages: ["hindi", "english"],
      primaryLanguage: "hindi",
      igFollowerCount: 250000,
      igEngagementRate: 4.5,
      igAvgLikes: 8000,
      igAvgComments: 350,
      igAvgReelViews: 45000,
      igLast8ReelViews: [42000, 51000, 38000, 55000, 40000, 48000, 52000, 44000],
      igMedianReelViews: 46000,
      igAudienceMalePct: 25,
      igAudienceFemalePct: 75,
      igAudienceTopAgeRange: "18-24",
      igCredibilityScore: 92,
      socialScore: 85,
      contentQualityScore: 4.2,
      reliabilityScore: 4.5,
      isVerified: false,
      rateInstagramReel: 15000,
      rateInstagramStory: 5000,
      rateInstagramPost: 10000,
      rateYoutubeVideo: 30000,
      rateCurrency: "INR",
      source: "manual_discovery",
      status: "active",
      onboardedAt: new Date("2025-06-15"),
      tags: ["beauty-creator", "hindi-content", "mumbai"],
      internalNotes: "Great engagement, very responsive. Prefers 2-week lead time for content.",
      createdBy: admin.id,
    },
  });

  const influencer2 = await prisma.influencer.create({
    data: {
      name: "Riya Kapoor",
      email: "riya.kapoor@gmail.com",
      phone: "+91-9876543211",
      instagramHandle: "riyakapoor_style",
      gender: "female",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      tier: "macro",
      categories: ["fashion", "beauty", "lifestyle"],
      contentNiches: ["OOTD", "hauls", "vlogs"],
      languages: ["english", "hindi"],
      primaryLanguage: "english",
      igFollowerCount: 820000,
      igEngagementRate: 3.2,
      igAvgLikes: 22000,
      igAvgComments: 800,
      igAvgReelViews: 120000,
      igLast8ReelViews: [110000, 135000, 95000, 140000, 105000, 128000, 115000, 125000],
      igMedianReelViews: 120000,
      igAudienceMalePct: 20,
      igAudienceFemalePct: 80,
      igAudienceTopAgeRange: "18-24",
      igCredibilityScore: 88,
      socialScore: 90,
      contentQualityScore: 4.5,
      reliabilityScore: 3.8,
      isVerified: true,
      rateInstagramReel: 45000,
      rateInstagramStory: 15000,
      rateInstagramPost: 30000,
      rateYoutubeVideo: 80000,
      rateCurrency: "INR",
      panNumber: "ABCDE1234F",
      gstin: "07ABCDE1234F1Z5",
      bankAccountName: "Riya Kapoor",
      bankName: "HDFC Bank",
      upiId: "riya@upi",
      paymentPreference: "bank_transfer",
      source: "instagram_dm",
      status: "active",
      onboardedAt: new Date("2025-04-10"),
      tags: ["fashion-creator", "english-content", "delhi", "verified"],
      createdBy: admin.id,
    },
  });

  const influencer3 = await prisma.influencer.create({
    data: {
      name: "Sneha Patel",
      email: "sneha.patel@gmail.com",
      instagramHandle: "sneha_skincare",
      gender: "female",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      tier: "nano",
      categories: ["skincare", "wellness"],
      contentNiches: ["reviews", "skincare-routine"],
      languages: ["english", "kannada"],
      primaryLanguage: "english",
      igFollowerCount: 8500,
      igEngagementRate: 7.2,
      igAvgLikes: 450,
      igAvgComments: 80,
      igAvgReelViews: 3200,
      igLast8ReelViews: [2800, 3500, 2900, 4200, 3100, 3800, 3000, 3400],
      igMedianReelViews: 3250,
      igAudienceMalePct: 15,
      igAudienceFemalePct: 85,
      socialScore: 65,
      source: "google_form",
      status: "onboarded",
      tags: ["nano-creator", "skincare-enthusiast"],
      createdBy: user1.id,
    },
  });

  const influencer4 = await prisma.influencer.create({
    data: {
      name: "Vikram Singh",
      email: "vikram@gmail.com",
      instagramHandle: "vikram_grooming",
      youtubeHandle: "VikramGrooming",
      gender: "male",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      tier: "micro",
      categories: ["grooming", "lifestyle", "fitness"],
      contentNiches: ["grooming-tips", "product-reviews"],
      languages: ["hindi", "english"],
      primaryLanguage: "hindi",
      igFollowerCount: 35000,
      igEngagementRate: 5.8,
      igAvgLikes: 1500,
      igAvgReelViews: 12000,
      igLast8ReelViews: [10000, 14000, 11000, 15000, 12000, 13000, 11500, 12500],
      igMedianReelViews: 12250,
      igAudienceMalePct: 70,
      igAudienceFemalePct: 30,
      socialScore: 72,
      rateInstagramReel: 5000,
      rateInstagramStory: 2000,
      source: "referral",
      referredBy: "Ananya Mishra",
      status: "active",
      onboardedAt: new Date("2025-08-01"),
      tags: ["male-creator", "grooming"],
      createdBy: user2.id,
    },
  });

  const influencer5 = await prisma.influencer.create({
    data: {
      name: "Pooja Reddy",
      instagramHandle: "pooja_glow",
      gender: "female",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      tier: "micro",
      categories: ["beauty", "skincare"],
      languages: ["telugu", "english"],
      igFollowerCount: 28000,
      igEngagementRate: 6.1,
      socialScore: 68,
      source: "email",
      status: "discovered",
      tags: ["regional-creator"],
      createdBy: user1.id,
    },
  });

  console.log("Created influencers");

  // Create campaign
  const campaign1 = await prisma.campaign.create({
    data: {
      brandId: brand1.id,
      name: "Summer Glow Collection Launch",
      description: "Launch campaign for the new Summer Glow makeup collection",
      status: "active",
      totalBudget: 500000,
      spentBudget: 125000,
      currency: "INR",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-04-30"),
      goals: {
        target_reach: 2000000,
        target_engagements: 100000,
        target_content_pieces: 15,
      },
      createdBy: admin.id,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      brandId: brand2.id,
      name: "Skincare Routine Challenge",
      description: "30-day skincare routine challenge with influencers",
      status: "draft",
      totalBudget: 300000,
      currency: "INR",
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-05-15"),
      createdBy: manager.id,
    },
  });

  console.log("Created campaigns");

  // Create collaborations
  const collab1 = await prisma.collaboration.create({
    data: {
      influencerId: influencer1.id,
      brandId: brand1.id,
      campaignId: campaign1.id,
      assignedTo: user1.id,
      type: "paid",
      status: "in_progress",
      agreedAmount: 45000,
      currency: "INR",
      deliverables: [
        { platform: "instagram", type: "reel", count: 2 },
        { platform: "instagram", type: "story", count: 3 },
      ],
      brief: "Create content showcasing the Summer Glow lipstick range. Focus on everyday wearability and shade variety.",
      dueDate: new Date("2026-03-25"),
      createdBy: user1.id,
    },
  });

  const collab2 = await prisma.collaboration.create({
    data: {
      influencerId: influencer2.id,
      brandId: brand1.id,
      campaignId: campaign1.id,
      assignedTo: user1.id,
      type: "paid",
      status: "confirmed",
      agreedAmount: 80000,
      currency: "INR",
      deliverables: [
        { platform: "instagram", type: "reel", count: 1 },
        { platform: "youtube", type: "video", count: 1 },
      ],
      brief: "Full GRWM using Summer Glow collection. YouTube video + Instagram reel.",
      dueDate: new Date("2026-04-01"),
      createdBy: user1.id,
    },
  });

  const collab3 = await prisma.collaboration.create({
    data: {
      influencerId: influencer3.id,
      brandId: brand2.id,
      assignedTo: user2.id,
      type: "barter",
      status: "content_submitted",
      deliverables: [
        { platform: "instagram", type: "reel", count: 1 },
        { platform: "instagram", type: "story", count: 2 },
      ],
      brief: "Review the Vitamin C Serum - share your honest experience over 2 weeks.",
      dueDate: new Date("2026-03-15"),
      createdBy: user2.id,
    },
  });

  const collab4 = await prisma.collaboration.create({
    data: {
      influencerId: influencer4.id,
      brandId: brand1.id,
      assignedTo: user2.id,
      type: "pr_gifting",
      status: "completed",
      deliverables: [
        { platform: "instagram", type: "story", count: 2 },
      ],
      brief: "Unboxing + quick review of the grooming kit",
      contentRating: 3.5,
      ratingNotes: "Content was decent but could have been more creative",
      createdBy: user2.id,
    },
  });

  console.log("Created collaborations");

  // Add products to collaborations
  await prisma.collaborationProduct.createMany({
    data: [
      { collaborationId: collab1.id, productId: products[0].id, quantity: 3 },
      { collaborationId: collab1.id, productId: products[2].id, quantity: 2 },
      { collaborationId: collab2.id, productId: products[0].id, quantity: 2 },
      { collaborationId: collab2.id, productId: products[1].id, quantity: 1 },
      { collaborationId: collab2.id, productId: products[2].id, quantity: 1 },
      { collaborationId: collab3.id, productId: products[3].id, quantity: 1 },
    ],
  });

  console.log("Created collaboration products");

  // Create PR parcels
  const parcel1 = await prisma.prParcel.create({
    data: {
      influencerId: influencer1.id,
      brandId: brand1.id,
      collaborationId: collab1.id,
      shippingAddress: "123, Andheri West, Mumbai, Maharashtra 400058",
      courierName: "Delhivery",
      trackingNumber: "DL2026031012345",
      status: "delivered",
      shippedAt: new Date("2026-03-10"),
      deliveredAt: new Date("2026-03-13"),
      createdBy: user1.id,
      items: {
        create: [
          { productId: products[0].id, quantity: 3 },
          { productId: products[2].id, quantity: 2 },
        ],
      },
    },
  });

  const parcel2 = await prisma.prParcel.create({
    data: {
      influencerId: influencer4.id,
      brandId: brand1.id,
      collaborationId: collab4.id,
      shippingAddress: "45, C-Scheme, Jaipur, Rajasthan 302001",
      courierName: "BlueDart",
      trackingNumber: "BD2026011056789",
      status: "delivered",
      shippedAt: new Date("2026-01-11"),
      deliveredAt: new Date("2026-01-14"),
      createdBy: user2.id,
      items: {
        create: [
          { productId: products[0].id, quantity: 1 },
          { productId: products[1].id, quantity: 1 },
          { productId: products[2].id, quantity: 1 },
        ],
      },
    },
  });

  const parcel3 = await prisma.prParcel.create({
    data: {
      influencerId: influencer3.id,
      brandId: brand2.id,
      collaborationId: collab3.id,
      shippingAddress: "78, Indiranagar, Bangalore, Karnataka 560038",
      courierName: "Delhivery",
      trackingNumber: "DL2026022067890",
      status: "delivered",
      shippedAt: new Date("2026-02-21"),
      deliveredAt: new Date("2026-02-24"),
      createdBy: user2.id,
      items: {
        create: [
          { productId: products[3].id, quantity: 1 },
          { productId: products[4].id, quantity: 1 },
        ],
      },
    },
  });

  console.log("Created PR parcels");

  // Create assets
  await prisma.asset.createMany({
    data: [
      {
        collaborationId: collab4.id,
        influencerId: influencer4.id,
        platform: "instagram",
        contentType: "reel",
        contentUrl: "https://instagram.com/stories/vikram_grooming/123",
        status: "published",
        views: 4500,
        likes: 0,
        reach: 3800,
        impressions: 5200,
        contentRating: 3.5,
        ratingTags: ["decent", "could-be-better"],
        publishedAt: new Date("2026-01-18"),
      },
      {
        collaborationId: collab4.id,
        influencerId: influencer4.id,
        platform: "instagram",
        contentType: "reel",
        contentUrl: "https://instagram.com/stories/vikram_grooming/124",
        status: "published",
        views: 5100,
        likes: 0,
        reach: 4200,
        impressions: 5800,
        contentRating: 3.5,
        publishedAt: new Date("2026-01-19"),
      },
      {
        collaborationId: collab3.id,
        influencerId: influencer3.id,
        platform: "instagram",
        contentType: "reel",
        status: "submitted",
        views: 0,
        likes: 0,
        contentRating: null,
      },
    ],
  });

  console.log("Created assets");

  // Create payments
  await prisma.payment.create({
    data: {
      collaborationId: collab1.id,
      influencerId: influencer1.id,
      amount: 45000,
      currency: "INR",
      tdsPercentage: 10,
      tdsAmount: 4500,
      netAmount: 40500,
      paymentMethod: "bank_transfer",
      status: "pending",
      approvedBy: null,
    },
  });

  console.log("Created payments");

  // Create a contract for the macro influencer
  await prisma.contract.create({
    data: {
      influencerId: influencer2.id,
      brandId: brand1.id,
      contractType: "brand_ambassador",
      title: "MARS Cosmetics Brand Ambassador - Riya Kapoor",
      description: "6-month brand ambassador agreement for MARS Cosmetics social media",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      autoRenew: false,
      contractValue: 500000,
      currency: "INR",
      paymentTerms: "Monthly payments of ₹83,333",
      status: "active",
      signedAt: new Date("2025-12-20"),
      expiryAlertDays: 30,
      createdBy: admin.id,
    },
  });

  console.log("Created contracts");

  console.log("\nSeed complete! Login credentials:");
  console.log("  Admin:   admin@mars.com / admin123");
  console.log("  Manager: manager@mars.com / user123");
  console.log("  User 1:  priya@mars.com / user123");
  console.log("  User 2:  rahul@mars.com / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
