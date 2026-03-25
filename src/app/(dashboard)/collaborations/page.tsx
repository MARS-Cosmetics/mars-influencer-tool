export const dynamic = "force-dynamic";

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
import { Plus, Search, Handshake } from "lucide-react";

function formatCurrency(amount: unknown): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "-";
  return `₹${num.toLocaleString("en-IN")}`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const typeColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  barter: "bg-blue-100 text-blue-800",
  pr_gifting: "bg-purple-100 text-purple-800",
};

const typeLabels: Record<string, string> = {
  paid: "Paid",
  barter: "Barter",
  pr_gifting: "PR Gifting",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  outreach: "bg-yellow-100 text-yellow-800",
  negotiation: "bg-orange-100 text-orange-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  content_submitted: "bg-cyan-100 text-cyan-800",
  content_approved: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  outreach: "Outreach",
  negotiation: "Negotiation",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  content_submitted: "Content Submitted",
  content_approved: "Content Approved",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function CollaborationsPage(props: {
  searchParams: Promise<{ search?: string; type?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.search || "";
  const typeFilter = searchParams.type || "";
  const statusFilter = searchParams.status || "";

  const where: Prisma.CollaborationWhereInput = {};

  if (search) {
    where.influencer = {
      name: { contains: search, mode: "insensitive" },
    };
  }

  if (typeFilter) {
    where.type = typeFilter as Prisma.CollaborationWhereInput["type"];
  }

  if (statusFilter) {
    where.status = statusFilter as Prisma.CollaborationWhereInput["status"];
  }

  const collaborations = await prisma.collaboration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      influencer: {
        select: { id: true, name: true, instagramHandle: true },
      },
      brand: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
      assets: {
        select: { views: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Handshake className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Collaborations</h1>
        </div>
        <Link href="/collaborations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Collaboration
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
                Search by influencer
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  name="search"
                  placeholder="Search influencer name..."
                  defaultValue={search}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                name="type"
                defaultValue={typeFilter}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Types</option>
                <option value="paid">Paid</option>
                <option value="barter">Barter</option>
                <option value="pr_gifting">PR Gifting</option>
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="outreach">Outreach</option>
                <option value="negotiation">Negotiation</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="content_submitted">Content Submitted</option>
                <option value="content_approved">Content Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
                <TableHead>Influencer</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agreed Amount</TableHead>
                <TableHead>CPV</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Content Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No collaborations found.
                  </TableCell>
                </TableRow>
              ) : (
                collaborations.map((collab) => (
                  <TableRow key={collab.id}>
                    <TableCell>
                      <Link
                        href={`/collaborations/${collab.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {collab.influencer.name}
                      </Link>
                      {collab.influencer.instagramHandle && (
                        <a
                          href={`https://instagram.com/${collab.influencer.instagramHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#A6192E] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{collab.influencer.instagramHandle}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>{collab.brand.name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[collab.type] || "bg-gray-100 text-gray-800"}`}
                      >
                        {typeLabels[collab.type] || collab.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[collab.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {statusLabels[collab.status] || collab.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(collab.agreedAmount as unknown as number)}</TableCell>
                    <TableCell>
                      {(() => {
                        if (collab.type === "barter" || collab.type === "pr_gifting") {
                          return <Badge className="bg-purple-100 text-purple-700">Barter</Badge>;
                        }
                        const totalViews = collab.assets.reduce((sum: number, a: { views: number | null }) => sum + (a.views || 0), 0);
                        if (!totalViews || !collab.agreedAmount) return "—";
                        const cpv = Number(collab.agreedAmount) / totalViews;
                        return `₹${cpv < 1 ? cpv.toFixed(3) : cpv.toFixed(2)}`;
                      })()}
                    </TableCell>
                    <TableCell>{collab.assignee.name}</TableCell>
                    <TableCell>{formatDate(collab.dueDate)}</TableCell>
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
