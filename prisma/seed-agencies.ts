/**
 * Seed 5 demo agencies. Safe to run multiple times (skips existing by name).
 *
 * Usage: npx tsx prisma/seed-agencies.ts
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const agencies = [
  {
    name: "Stardom Talent Agency",
    contactPerson: "Neha Khanna",
    email: "neha@stardomtalent.in",
    phone: "+91-9800011111",
    website: "https://stardomtalent.in",
    address: "301, Crystal Tower, Andheri West",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400058",
    gstNumber: "27AABCS1234D1Z5",
    panNumber: "AABCS1234D",
    commissionPct: 15,
    businessType: "Private Limited",
    yearsInBusiness: 8,
    annualTurnover: "₹5 Crore - ₹10 Crore",
    directorName: "Neha Khanna",
    bankName: "HDFC Bank",
    bankAccountNumber: "50100123456789",
    bankIfsc: "HDFC0001234",
    bankBranch: "Andheri West",
    bankAccountType: "Current",
    notes: "Top-tier agency handling macro and mega influencers in beauty/fashion space.",
  },
  {
    name: "InfluenceHub Media",
    contactPerson: "Amit Joshi",
    email: "amit@influencehub.co",
    phone: "+91-9800022222",
    website: "https://influencehub.co",
    address: "12, Barakhamba Road, 2nd Floor",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    gstNumber: "07BBHIJ5678K1Z3",
    panNumber: "BBHIJ5678K",
    commissionPct: 12,
    businessType: "LLP (Limited Liability Partnership)",
    yearsInBusiness: 3,
    annualTurnover: "₹1 Crore - ₹5 Crore",
    directorName: "Amit Joshi",
    bankName: "ICICI Bank",
    bankAccountNumber: "12340567890123",
    bankIfsc: "ICIC0005678",
    bankBranch: "Connaught Place",
    bankAccountType: "Current",
    notes: "Specializes in micro and mid-tier influencers across North India.",
  },
  {
    name: "CreatorConnect",
    contactPerson: "Divya Rao",
    email: "divya@creatorconnect.in",
    phone: "+91-9800033333",
    website: "https://creatorconnect.in",
    address: "45, 100 Feet Road, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    panNumber: "CCRDC9012E",
    commissionPct: 10,
    businessType: "Proprietorship",
    yearsInBusiness: 1,
    annualTurnover: "₹10 Lakhs - ₹50 Lakhs",
    directorName: "Divya Rao",
    bankName: "Kotak Mahindra Bank",
    bankAccountNumber: "98760543210987",
    bankIfsc: "KKBK0009012",
    bankBranch: "Indiranagar",
    bankAccountType: "Savings",
    notes: "Small agency focused on tech and lifestyle creators in South India.",
  },
  {
    name: "BrandBridge Partners",
    contactPerson: "Rohit Mehra",
    email: "rohit@brandbridge.co.in",
    phone: "+91-9800044444",
    website: "https://brandbridge.co.in",
    address: "8th Floor, Cyber Hub, DLF Phase 2",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122002",
    gstNumber: "06DDBPM3456L1Z8",
    panNumber: "DDBPM3456L",
    commissionPct: 18,
    businessType: "Partnership",
    yearsInBusiness: 6,
    annualTurnover: "₹10 Crore - ₹25 Crore",
    directorName: "Rohit Mehra",
    bankName: "Axis Bank",
    bankAccountNumber: "92000987654321",
    bankIfsc: "UTIB0003456",
    bankBranch: "Cyber City",
    bankAccountType: "Current",
    notes: "Full-service agency managing celebrity and mega influencers. Handles brand deals end-to-end.",
  },
  {
    name: "ViralVerse Agency",
    contactPerson: "Prerna Shah",
    email: "prerna@viralverse.in",
    phone: "+91-9800055555",
    address: "22, CG Road, Navrangpura",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380009",
    gstNumber: "24EEVPS7890M1Z1",
    panNumber: "EEVPS7890M",
    commissionPct: 14,
    businessType: "One Person Company (OPC)",
    yearsInBusiness: 2,
    annualTurnover: "₹50 Lakhs - ₹1 Crore",
    directorName: "Prerna Shah",
    bankName: "State Bank of India",
    bankAccountNumber: "38765432109876",
    bankIfsc: "SBIN0007890",
    bankBranch: "Navrangpura",
    bankAccountType: "Current",
    notes: "Regional agency specializing in Gujarati and Hindi content creators. Strong in food and lifestyle niche.",
  },
];

async function main() {
  console.log("\n🏢 Seeding 5 demo agencies...\n");

  let created = 0;
  let skipped = 0;

  for (const agency of agencies) {
    const existing = await prisma.agency.findFirst({ where: { name: agency.name } });
    if (existing) {
      console.log(`  ⤳ ${agency.name} — already exists, skipping`);
      skipped++;
    } else {
      await prisma.agency.create({ data: agency });
      console.log(`  ✓ ${agency.name} — created`);
      created++;
    }
  }

  console.log(`\n✅ Done! ${created} created, ${skipped} skipped.\n`);
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
