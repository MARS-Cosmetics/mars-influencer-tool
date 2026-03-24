import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const defaultTerms = [
  {
    name: "100% Advance",
    description: "Full payment upfront on confirmation",
    installments: [{ percentage: 100, trigger: "on_confirmation", label: "Full Payment" }],
    isDefault: true,
  },
  {
    name: "50-50 Split",
    description: "50% advance on confirmation, 50% on content approval",
    installments: [
      { percentage: 50, trigger: "on_confirmation", label: "Advance" },
      { percentage: 50, trigger: "on_content_approval", label: "On Approval" },
    ],
  },
  {
    name: "30-70 Split",
    description: "30% advance, 70% on content approval",
    installments: [
      { percentage: 30, trigger: "on_confirmation", label: "Advance" },
      { percentage: 70, trigger: "on_content_approval", label: "On Approval" },
    ],
  },
  {
    name: "100% On Completion",
    description: "Full payment after collaboration is completed",
    installments: [{ percentage: 100, trigger: "on_completion", label: "On Completion" }],
  },
  {
    name: "Net 30",
    description: "Full payment within 30 days of invoice",
    installments: [{ percentage: 100, trigger: "net_30", label: "Net 30" }],
  },
  {
    name: "Three-Way Split",
    description: "33% advance, 33% on submission, 34% on approval",
    installments: [
      { percentage: 33, trigger: "on_confirmation", label: "Advance" },
      { percentage: 33, trigger: "on_content_submission", label: "On Submission" },
      { percentage: 34, trigger: "on_content_approval", label: "On Approval" },
    ],
  },
];

async function main() {
  for (const term of defaultTerms) {
    await prisma.paymentTerm.upsert({
      where: { name: term.name },
      update: { ...term },
      create: { ...term },
    });
  }
  console.log("Payment terms seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
