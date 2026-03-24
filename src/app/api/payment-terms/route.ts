import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Installment {
  percentage: number;
  trigger: string;
  label: string;
}

export async function GET() {
  try {
    const paymentTerms = await prisma.paymentTerm.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(paymentTerms);
  } catch (error) {
    console.error("Failed to fetch payment terms:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment terms" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const installments = body.installments as Installment[];
    if (!Array.isArray(installments) || installments.length === 0) {
      return NextResponse.json(
        { error: "At least one installment is required" },
        { status: 400 }
      );
    }

    const totalPercentage = installments.reduce(
      (sum: number, inst: Installment) => sum + Number(inst.percentage),
      0
    );
    if (totalPercentage !== 100) {
      return NextResponse.json(
        { error: `Installment percentages must sum to 100% (currently ${totalPercentage}%)` },
        { status: 400 }
      );
    }

    // If setting as default, unset existing default
    if (body.isDefault) {
      await prisma.paymentTerm.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const paymentTerm = await prisma.paymentTerm.create({
      data: {
        name: body.name.trim(),
        description: body.description || null,
        installments: body.installments,
        isDefault: body.isDefault ?? false,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(paymentTerm, { status: 201 });
  } catch (error) {
    console.error("Failed to create payment term:", error);
    return NextResponse.json(
      { error: "Failed to create payment term" },
      { status: 500 }
    );
  }
}
