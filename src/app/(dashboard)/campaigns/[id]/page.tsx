export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { CampaignStatus, CollaborationStatus } from "@/generated/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, IndianRupee, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const campaignStatusColors: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const collabStatusColors: Record<CollaborationStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  outreach: "bg-blue-100 text-blue-700",
  negotiation: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  content_submitted: "bg-purple-100 text-purple-700",
  content_approved: "bg-teal-100 text-teal-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      brand: true,
      collaborations: {
        include: {
          influencer: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const budgetUsedPct =
    campaign.totalBudget && Number(campaign.totalBudget) > 0
      ? Math.round(
          (Number(campaign.spentBudget || 0) / Number(campaign.totalBudget)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-gray-500">{campaign.brand.name}</p>
        </div>
        <Badge className={campaignStatusColors[campaign.status]}>
          {campaign.status}
        </Badge>
      </div>

      {campaign.description && (
        <p className="text-gray-600">{campaign.description}</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Budget Overview
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(campaign.totalBudget)}
            </p>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              <span>Spent: {formatCurrency(campaign.spentBudget)}</span>
              <span>{budgetUsedPct}% used</span>
            </div>
            {campaign.totalBudget && Number(campaign.totalBudget) > 0 && (
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Timeline
            </CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-gray-500">Start:</span>{" "}
                {formatDate(campaign.startDate)}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">End:</span>{" "}
                {formatDate(campaign.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Goals
            </CardTitle>
            <Target className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {campaign.goals && typeof campaign.goals === "object" && !Array.isArray(campaign.goals) ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(campaign.goals as Record<string, unknown>).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-sm font-medium">
                      {typeof value === "number" ? value.toLocaleString("en-IN") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No goals set</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collaborations ({campaign.collaborations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.collaborations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No collaborations in this campaign yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agreed Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.collaborations.map((collab) => (
                  <TableRow key={collab.id}>
                    <TableCell className="font-medium">
                      {collab.influencer.name}
                    </TableCell>
                    <TableCell>
                      {collab.type.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge className={collabStatusColors[collab.status]}>
                        {collab.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(collab.agreedAmount)}</TableCell>
                    <TableCell>{formatDate(collab.createdAt)}</TableCell>
                    <TableCell>{formatDate(collab.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
