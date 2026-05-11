export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  Flame,
  User,
  Building2,
  BarChart3,
  Link as LinkIcon,
  Music,
  Hash,
  Clock,
  FileText,
  Pencil,
} from "lucide-react";
import { ContentRating } from "@/components/content-rating";
import { ContentReview } from "@/components/content-review";
import { RefreshMetricsButton } from "./refresh-metrics-button";
import { RefreshBrightDataButton } from "./refresh-brightdata-button";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value >= 10_00_000) {
    return (value / 10_00_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function platformBadgeClass(platform: string) {
  const map: Record<string, string> = {
    instagram: "bg-pink-100 text-pink-800",
    youtube: "bg-red-100 text-red-800",
    twitter: "bg-sky-100 text-sky-800",
    linkedin: "bg-blue-100 text-blue-800",
    blog: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800",
  };
  return map[platform] || "bg-gray-100 text-gray-800";
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    revision_requested: "bg-orange-100 text-orange-800",
    published: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

export default async function AssetDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      influencer: true,
      collaboration: {
        include: {
          brand: true,
          campaign: true,
          _count: { select: { assets: true } },
        },
      },
    },
  });

  if (!asset) {
    notFound();
  }

  const revisions = await prisma.assetRevision.findMany({
    where: { assetId: asset.id },
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { version: "desc" },
  });

  // CPV Calculation
  const isBarter = asset.collaboration?.type === "barter";
  let cpvDisplay = "—";
  if (isBarter) {
    cpvDisplay = "Barter";
  } else if (asset.views && asset.views > 0 && asset.collaboration?.agreedAmount) {
    const totalAmount = Number(asset.collaboration.agreedAmount);
    const assetCount = asset.collaboration._count?.assets || 1;
    const perAssetCost = totalAmount / assetCount;
    const cpv = perAssetCost / asset.views;
    cpvDisplay = `₹${cpv < 1 ? cpv.toFixed(3) : cpv.toFixed(2)}`;
  }

  const metrics = [
    { label: "Views", value: asset.views },
    { label: "Likes", value: asset.likes },
    { label: "Comments", value: asset.comments },
    { label: "Shares", value: asset.shares },
    { label: "Saves", value: asset.saves },
    { label: "Reach", value: asset.reach },
    { label: "Impressions", value: asset.impressions },
  ];

  const engagementRate =
    asset.views && asset.views > 0
      ? (((asset.likes || 0) + (asset.comments || 0) + (asset.shares || 0)) /
          asset.views) *
        100
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/assets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {asset.contentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={platformBadgeClass(asset.platform)}>
                {asset.platform}
              </Badge>
              <Badge className={statusBadgeClass(asset.status)}>
                {asset.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Link href={`/assets/${asset.id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {(() => {
            const platformOk = asset.platform === "instagram";
            const urlOk = Boolean(asset.contentUrl);
            const isDisabled = !platformOk || !urlOk;
            const reason = !platformOk
              ? `Platform is "${asset.platform}", not "instagram" — Bright Data integration only supports IG`
              : !urlOk
                ? "This asset has no Content URL set. Edit the asset and paste the Instagram post/reel URL."
                : undefined;
            return (
              <RefreshBrightDataButton
                assetId={asset.id}
                disabled={isDisabled}
                disabledReason={reason}
              />
            );
          })()}
          <RefreshMetricsButton
            assetId={asset.id}
            lastSyncedAt={asset.influencer.metricsLastSyncedAt?.toISOString() ?? null}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Content Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="h-4 w-4" />
              Content Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Content URL</span>
              {asset.contentUrl ? (
                <a
                  href={asset.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  View Content
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-sm text-gray-400">-</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Published Date</span>
              <span className="text-sm">{formatDate(asset.publishedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Due Date</span>
              <span className="text-sm">{formatDate(asset.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Ad Rights</span>
              {asset.hasAdRights ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Ad Rights ✓
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  No Ad Rights
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Associations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Associations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Influencer</span>
              <Link
                href={`/influencers/${asset.influencer.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {asset.influencer.name}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Collaboration</span>
              <Link
                href={`/collaborations/${asset.collaboration.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View Collaboration
              </Link>
            </div>
            {asset.collaboration.campaign && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Campaign</span>
                <span className="text-sm">
                  {asset.collaboration.campaign.name}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Brand</span>
              <span className="text-sm font-medium">
                {asset.collaboration.brand.name}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((m) => (
                <div key={m.label}>
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(m.value)}
                  </p>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500">Engagement Rate</p>
                <p className="text-lg font-semibold">
                  {engagementRate !== null
                    ? engagementRate.toFixed(2) + "%"
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CPV (Cost Per View)</p>
                {cpvDisplay === "Barter" ? (
                  <Badge className="bg-purple-100 text-purple-700 mt-1">Barter</Badge>
                ) : (
                  <p className="text-lg font-semibold">{cpvDisplay}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post Metadata Card (Bright Data) */}
        {asset.brightDataSnapshot &&
          typeof asset.brightDataSnapshot === "object" &&
          !Array.isArray(asset.brightDataSnapshot) &&
          (() => {
            const bd = asset.brightDataSnapshot as {
              caption?: string | null;
              hashtags?: string[];
              audio?: {
                title?: string | null;
                artist?: string | null;
                isOriginalAudio?: boolean | null;
              } | null;
              videoDurationSec?: number | null;
              isPaidPartnership?: boolean | null;
              datePosted?: string | null;
              contentTypeLabel?: string | null;
              thumbnail?: string | null;
            };
            const durStr =
              typeof bd.videoDurationSec === "number"
                ? `${Math.floor(bd.videoDurationSec / 60)}:${String(
                    Math.round(bd.videoDurationSec % 60),
                  ).padStart(2, "0")}`
                : null;
            const anyContent =
              bd.caption ||
              (bd.hashtags && bd.hashtags.length > 0) ||
              bd.audio ||
              durStr ||
              bd.isPaidPartnership !== undefined ||
              bd.datePosted ||
              bd.contentTypeLabel;
            if (!anyContent) return null;
            return (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Post Metadata
                    </span>
                    {asset.brightDataSyncedAt && (
                      <span className="text-[11px] font-normal text-gray-500">
                        Synced {formatDateTime(asset.brightDataSyncedAt)}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {bd.contentTypeLabel && (
                      <Badge className="bg-indigo-100 text-indigo-800">
                        {bd.contentTypeLabel}
                      </Badge>
                    )}
                    {bd.isPaidPartnership && (
                      <Badge className="bg-amber-100 text-amber-800">
                        Paid Partnership
                      </Badge>
                    )}
                    {bd.datePosted && (
                      <span className="text-xs text-gray-500">
                        Posted {formatDate(bd.datePosted)}
                      </span>
                    )}
                    {durStr && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {durStr}
                      </span>
                    )}
                  </div>

                  {bd.caption && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Caption
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-gray-800">
                        {bd.caption}
                      </p>
                    </div>
                  )}

                  {bd.hashtags && bd.hashtags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Hashtags ({bd.hashtags.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {bd.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {bd.audio && (bd.audio.title || bd.audio.artist) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        Audio
                      </p>
                      <p className="text-sm text-gray-800">
                        {bd.audio.title || "—"}
                        {bd.audio.artist && (
                          <span className="text-gray-500"> — {bd.audio.artist}</span>
                        )}
                        {bd.audio.isOriginalAudio && (
                          <Badge className="ml-2 bg-purple-100 text-purple-700 text-[10px]">
                            Original
                          </Badge>
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

        {/* Viral Status Card */}
        {asset.isViral && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-orange-500" />
                Viral Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                  🔥 VIRAL
                </span>
                {asset.viralMultiplier && (
                  <span className="text-sm font-semibold text-orange-700">
                    {String(asset.viralMultiplier)}x multiplier
                  </span>
                )}
              </div>
              {asset.peakViews && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Peak Views</span>
                  <span className="text-sm font-medium">
                    {formatNumber(asset.peakViews)}
                  </span>
                </div>
              )}
              {asset.viralDetectedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Detected At</span>
                  <span className="text-sm">
                    {formatDateTime(asset.viralDetectedAt)}
                  </span>
                </div>
              )}
              {asset.metricsSnapshot && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Metrics Snapshots
                    </p>
                    <pre className="rounded-md bg-white p-3 text-xs text-gray-700 overflow-x-auto border">
                      {JSON.stringify(asset.metricsSnapshot, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rating Section */}
        <Card className={asset.isViral ? "md:col-span-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4" />
              Content Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asset.contentRating != null && (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 border">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Number(asset.contentRating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium">
                    {Number(asset.contentRating)}/5
                  </span>
                </div>
                {asset.ratingTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.ratingTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {asset.ratingNotes && (
                  <p className="mt-2 text-sm text-gray-600">
                    {asset.ratingNotes}
                  </p>
                )}
              </div>
            )}
            <ContentRating
              assetId={asset.id}
              contentUrl={asset.contentUrl}
              currentRating={
                asset.contentRating != null
                  ? Number(asset.contentRating)
                  : undefined
              }
              currentTags={asset.ratingTags}
            />
          </CardContent>
        </Card>

        {/* Content Review Section */}
        <ContentReview
          assetId={asset.id}
          currentVersion={asset.version ?? 1}
          currentContentUrl={asset.contentUrl ?? undefined}
          revisions={revisions.map((r) => ({
            id: r.id,
            version: r.version,
            contentUrl: r.contentUrl,
            status: r.status,
            feedback: r.feedback,
            reviewedAt: r.reviewedAt?.toISOString() ?? null,
            createdAt: r.submittedAt.toISOString(),
            reviewer: r.reviewer,
          }))}
        />
      </div>
    </div>
  );
}
