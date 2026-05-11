export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditAssetForm } from "./edit-asset-form";

export default async function EditAssetPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      influencer: { select: { id: true, name: true } },
      collaboration: { select: { id: true, brand: { select: { name: true } } } },
    },
  });

  if (!asset) notFound();

  // Pre-serialize dates so the client form can use them directly in <input>.
  const initial = {
    id: asset.id,
    platform: asset.platform as string,
    contentType: asset.contentType as string,
    status: asset.status as string,
    contentUrl: asset.contentUrl ?? "",
    fileUrl: asset.fileUrl ?? "",
    thumbnailUrl: asset.thumbnailUrl ?? "",
    dueDate: asset.dueDate ? asset.dueDate.toISOString().slice(0, 10) : "",
    publishedAt: asset.publishedAt
      ? asset.publishedAt.toISOString().slice(0, 16)
      : "",
    hasAdRights: asset.hasAdRights,
    views: asset.views ?? "",
    likes: asset.likes ?? "",
    comments: asset.comments ?? "",
    shares: asset.shares ?? "",
    saves: asset.saves ?? "",
    reach: asset.reach ?? "",
    impressions: asset.impressions ?? "",
    contentRating: asset.contentRating != null ? Number(asset.contentRating) : "",
    ratingTags: asset.ratingTags.join(", "),
    ratingNotes: asset.ratingNotes ?? "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/assets/${asset.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Asset</h1>
          <p className="text-sm text-muted-foreground">
            {asset.influencer.name} ·{" "}
            {asset.collaboration?.brand?.name ?? "no brand"}
          </p>
        </div>
      </div>

      <EditAssetForm initial={initial} />
    </div>
  );
}
