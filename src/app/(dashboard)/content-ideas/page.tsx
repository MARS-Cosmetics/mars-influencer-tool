export const revalidate = 60;

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Lightbulb } from "lucide-react";

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

const platformColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  youtube: "bg-red-100 text-red-800",
  twitter: "bg-sky-100 text-sky-800",
  linkedin: "bg-blue-100 text-blue-800",
  blog: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
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

export default async function ContentIdeasPage(props: {
  searchParams: Promise<{
    search?: string;
    theme?: string;
    status?: string;
    priority?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.search || "";
  const themeFilter = searchParams.theme || "";
  const statusFilter = searchParams.status || "";
  const priorityFilter = searchParams.priority || "";

  const where: Prisma.ContentIdeaWhereInput = {};

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  if (themeFilter) {
    where.theme = themeFilter as Prisma.ContentIdeaWhereInput["theme"];
  }

  if (statusFilter) {
    where.status = statusFilter as Prisma.ContentIdeaWhereInput["status"];
  }

  if (priorityFilter) {
    where.priority = priorityFilter as Prisma.ContentIdeaWhereInput["priority"];
  }

  const contentIdeas = await prisma.contentIdea.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      brand: {
        select: { id: true, name: true },
      },
      campaign: {
        select: { id: true, name: true },
      },
      influencer: {
        select: { id: true, name: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Content Ideas</h1>
        </div>
        <Link href="/content-ideas/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Content Idea
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Search by title
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  name="search"
                  placeholder="Search content ideas..."
                  defaultValue={search}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Theme
              </label>
              <select
                name="theme"
                defaultValue={themeFilter}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Themes</option>
                {Object.entries(themeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                name="priority"
                defaultValue={priorityFilter}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Priorities</option>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              <Search className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Influencer</TableHead>
                <TableHead>Target Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contentIdeas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-gray-500"
                  >
                    No content ideas found.
                  </TableCell>
                </TableRow>
              ) : (
                contentIdeas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell>
                      <Link
                        href={`/content-ideas/${idea.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {idea.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${themeColors[idea.theme] || "bg-gray-100 text-gray-800"}`}
                      >
                        {themeLabels[idea.theme] || idea.theme}
                      </span>
                    </TableCell>
                    <TableCell>
                      {idea.platform ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${platformColors[idea.platform] || "bg-gray-100 text-gray-800"}`}
                        >
                          {platformLabels[idea.platform] || idea.platform}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {idea.priority ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[idea.priority] || "bg-gray-100 text-gray-800"}`}
                        >
                          {priorityLabels[idea.priority] || idea.priority}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[idea.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {statusLabels[idea.status] || idea.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {idea.campaign?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {idea.influencer?.name || "-"}
                    </TableCell>
                    <TableCell>{formatDate(idea.targetDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
