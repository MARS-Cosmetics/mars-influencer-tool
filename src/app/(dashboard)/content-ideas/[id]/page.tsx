export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Lightbulb,
  Calendar,
  User,
  Building2,
  Megaphone,
  Handshake,
  ExternalLink,
  FileText,
} from "lucide-react";

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

const themeColors: Record<string, string> = {
  festival: "bg-orange-100 text-orange-800",
  launch: "bg-blue-100 text-blue-800",
  tutorial: "bg-cyan-100 text-cyan-800",
  grwm: "bg-pink-100 text-pink-800",
  haul: "bg-yellow-100 text-yellow-800",
  review: "bg-teal-100 text-teal-800",
  unboxing: "bg-purple-100 text-purple-800",
  challenge: "bg-red-100 text-red-800",
  collab: "bg-indigo-100 text-indigo-800",
  seasonal: "bg-amber-100 text-amber-800",
  trending: "bg-rose-100 text-rose-800",
  educational: "bg-emerald-100 text-emerald-800",
  behind_the_scenes: "bg-slate-100 text-slate-800",
  other: "bg-gray-100 text-gray-800",
};

const themeLabels: Record<string, string> = {
  festival: "Festival",
  launch: "Launch",
  tutorial: "Tutorial",
  grwm: "GRWM",
  haul: "Haul",
  review: "Review",
  unboxing: "Unboxing",
  challenge: "Challenge",
  collab: "Collab",
  seasonal: "Seasonal",
  trending: "Trending",
  educational: "Educational",
  behind_the_scenes: "Behind the Scenes",
  other: "Other",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  blog: "Blog",
  other: "Other",
};

const contentTypeLabels: Record<string, string> = {
  reel: "Reel",
  static_post: "Static Post",
  carousel: "Carousel",
  video: "Video",
  short: "Short",
  tweet: "Tweet",
  article: "Article",
  other: "Other",
};

const statusColors: Record<string, string> = {
  idea: "bg-gray-100 text-gray-800",
  approved: "bg-blue-100 text-blue-800",
  briefed: "bg-indigo-100 text-indigo-800",
  in_production: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  idea: "Idea",
  approved: "Approved",
  briefed: "Briefed",
  in_production: "In Production",
  published: "Published",
  rejected: "Rejected",
};

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default async function ContentIdeaDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const contentIdea = await prisma.contentIdea.findUnique({
    where: { id },
    include: {
      brand: true,
      campaign: true,
      collaboration: {
        include: {
          influencer: { select: { id: true, name: true } },
        },
      },
      influencer: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!contentIdea) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/content-ideas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{contentIdea.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${themeColors[contentIdea.theme]}`}
              >
                {themeLabels[contentIdea.theme]}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[contentIdea.status]}`}
              >
                {statusLabels[contentIdea.status]}
              </span>
              {contentIdea.priority && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[contentIdea.priority]}`}
                >
                  {priorityLabels[contentIdea.priority]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/content-ideas/${contentIdea.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <DeleteButton contentIdeaId={contentIdea.id} />
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Content Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Theme</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${themeColors[contentIdea.theme]}`}
              >
                {themeLabels[contentIdea.theme]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Platform</span>
              <span className="text-sm">
                {contentIdea.platform
                  ? platformLabels[contentIdea.platform] || contentIdea.platform
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Content Type</span>
              <span className="text-sm">
                {contentIdea.contentType
                  ? contentTypeLabels[contentIdea.contentType] ||
                    contentIdea.contentType
                  : "-"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[contentIdea.status]}`}
              >
                {statusLabels[contentIdea.status]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Priority</span>
              {contentIdea.priority ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[contentIdea.priority]}`}
                >
                  {priorityLabels[contentIdea.priority]}
                </span>
              ) : (
                <span className="text-sm">-</span>
              )}
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Target Date</span>
              <span className="text-sm">
                {formatDate(contentIdea.targetDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created</span>
              <span className="text-sm">
                {formatDateTime(contentIdea.createdAt)}
              </span>
            </div>
            {contentIdea.creator && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Created By</span>
                <span className="text-sm">{contentIdea.creator.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Associations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Associations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Brand</span>
              <span className="text-sm font-medium">
                {contentIdea.brand?.name || "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Campaign</span>
              {contentIdea.campaign ? (
                <Link
                  href={`/campaigns/${contentIdea.campaign.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {contentIdea.campaign.name}
                </Link>
              ) : (
                <span className="text-sm">-</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Influencer</span>
              {contentIdea.influencer ? (
                <Link
                  href={`/influencers/${contentIdea.influencer.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {contentIdea.influencer.name}
                </Link>
              ) : (
                <span className="text-sm">-</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Collaboration</span>
              {contentIdea.collaboration ? (
                <Link
                  href={`/collaborations/${contentIdea.collaboration.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {contentIdea.collaboration.influencer?.name || "View"}
                </Link>
              ) : (
                <span className="text-sm">-</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description & Notes */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Description & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contentIdea.description ? (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Description
                </span>
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                  {contentIdea.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No description provided</p>
            )}
            {contentIdea.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Notes
                  </span>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {contentIdea.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reference Material */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-4 w-4" />
              Reference Material
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contentIdea.moodboardUrl && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Moodboard</span>
                <a
                  href={contentIdea.moodboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  Open Moodboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {contentIdea.referenceUrls &&
            contentIdea.referenceUrls.length > 0 ? (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Reference URLs
                </span>
                <ul className="mt-2 space-y-1">
                  {contentIdea.referenceUrls.map((url, index) => (
                    <li key={index}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              !contentIdea.moodboardUrl && (
                <p className="text-sm text-gray-400">
                  No reference material added
                </p>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeleteButton({ contentIdeaId }: { contentIdeaId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { prisma } = await import("@/lib/db");
        await prisma.contentIdea.delete({
          where: { id: contentIdeaId },
        });
        const { redirect } = await import("next/navigation");
        redirect("/content-ideas");
      }}
    >
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </form>
  );
}
