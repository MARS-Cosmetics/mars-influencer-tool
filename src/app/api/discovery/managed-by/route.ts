import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { lookupManagedByForHandles } from "@/lib/influencer-ownership";

/**
 * Given a batch of Instagram handles (as returned in search results), return
 * which ones are already in our influencer roster and who manages them.
 * Used by the discovery UI to badge cards as "Managed by X" without firing
 * one DB query per card.
 */

const BodySchema = z.object({
  handles: z.array(z.string().min(1)).max(100),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const map = await lookupManagedByForHandles(parsed.data.handles);
  return NextResponse.json({
    managed: Object.fromEntries(map),
  });
}
