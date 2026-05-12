import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildPaymentExportBuffer,
  exportFilename,
  type PaymentExportRow,
} from "@/lib/payment-export";

/**
 * Generates the weekly XLSX from a list of asset IDs. Does NOT mutate any
 * payment state — that's bulk-update-status's job. Body: { assetIds: string[] }.
 *
 * Bank details are PII; only admin / manager / finance roles get the file.
 * (Plain users get 403 even though the API would otherwise work.)
 */
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "manager") {
    return NextResponse.json(
      { error: "Only admins/managers can export payment data" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    assetIds?: string[];
  };
  const assetIds = Array.isArray(body.assetIds) ? body.assetIds : [];
  if (assetIds.length === 0) {
    return NextResponse.json(
      { error: "assetIds array is required" },
      { status: 400 },
    );
  }

  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: {
      id: true,
      contentUrl: true,
      publishedAt: true,
      dueDate: true,
      collaboration: {
        select: {
          id: true,
          type: true,
          dueDate: true,
          assignee: { select: { name: true } },
          payments: {
            select: {
              id: true,
              status: true,
              installmentLabel: true,
              amount: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      influencer: {
        select: {
          name: true,
          panNumber: true,
          gstin: true,
          bankAccountName: true,
          bankAccountNumber: true,
          bankIfscCode: true,
        },
      },
    },
  });

  const rows: PaymentExportRow[] = assets.map((a) => {
    const isBarter = a.collaboration.type === "barter";
    const payment = a.collaboration.payments[0];
    // KYC text. Aadhar / doc URLs are out of scope.
    const supporting = [
      a.influencer.panNumber ? `PAN: ${a.influencer.panNumber}` : null,
      a.influencer.gstin ? `GSTIN: ${a.influencer.gstin}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      poc: a.collaboration.assignee?.name ?? "",
      // Barter has no Payment row — show literal "Barter" so finance
      // immediately sees there's nothing to wire.
      paymentStatus: isBarter ? "barter" : (payment?.status ?? null),
      dueDate: a.collaboration.dueDate ?? a.dueDate ?? null,
      reelLiveDate: a.publishedAt,
      // Bank fields blank for barter — no money moves.
      accountNumber: isBarter ? null : a.influencer.bankAccountNumber,
      ifscCode: isBarter ? null : a.influencer.bankIfscCode,
      liveLink: a.contentUrl,
      invoiceLink: null,
      comments: isBarter ? "Barter collaboration" : (payment?.installmentLabel ?? null),
      account: isBarter ? null : a.influencer.bankAccountName,
      supportingDocument: supporting || null,
      financeComments: null,
    };
  });

  const buf = buildPaymentExportBuffer(rows);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
