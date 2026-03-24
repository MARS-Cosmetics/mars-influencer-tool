import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Installment {
  percentage: number;
  trigger: string;
  label: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentTerm = await prisma.paymentTerm.findUnique({
      where: { id },
    });

    if (!paymentTerm) {
      return NextResponse.json(
        { error: "Payment term not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(paymentTerm);
  } catch (error) {
    console.error("Failed to fetch payment term:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment term" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.installments) {
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
    }

    // If setting as default, unset existing default
    if (body.isDefault) {
      await prisma.paymentTerm.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const paymentTerm = await prisma.paymentTerm.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        installments: body.installments,
        isDefault: body.isDefault,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(paymentTerm);
  } catch (error) {
    console.error("Failed to update payment term:", error);
    return NextResponse.json(
      { error: "Failed to update payment term" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.paymentTerm.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to deactivate payment term:", error);
    return NextResponse.json(
      { error: "Failed to deactivate payment term" },
      { status: 500 }
    );
  }
}
