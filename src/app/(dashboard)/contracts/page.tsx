export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ContractStatus, ContractType } from "@/generated/prisma";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, AlertTriangle } from "lucide-react";

function formatINR(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    signed: "bg-indigo-100 text-indigo-800",
    active: "bg-green-100 text-green-800",
    expired: "bg-red-100 text-red-800",
    terminated: "bg-red-100 text-red-600",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

function typeBadgeClass(type: string) {
  const map: Record<string, string> = {
    exclusivity: "bg-purple-100 text-purple-800",
    brand_ambassador: "bg-pink-100 text-pink-800",
    retainer: "bg-blue-100 text-blue-800",
    one_time: "bg-gray-100 text-gray-800",
    nda: "bg-yellow-100 text-yellow-800",
  };
  return map[type] || "bg-gray-100 text-gray-800";
}

function isExpiringSoon(endDate: Date): boolean {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const end = new Date(endDate);
  return end >= now && end <= thirtyDaysFromNow;
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { influencer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (statusFilter) {
    where.status = statusFilter;
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      influencer: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const statuses = Object.values(ContractStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contracts</h1>
        <Link href="/contracts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            name="search"
            placeholder="Search by title or influencer..."
            defaultValue={search}
            className="pl-9"
          />
        </form>
        <form className="flex items-center gap-2">
          <input type="hidden" name="search" value={search} />
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Influencer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No contracts found.
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => {
                const expiring = isExpiringSoon(contract.endDate);
                return (
                  <TableRow
                    key={contract.id}
                    className={expiring ? "bg-amber-50" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {contract.title}
                        {expiring && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{contract.influencer.name}</TableCell>
                    <TableCell>
                      <Badge className={typeBadgeClass(contract.contractType)}>
                        {contract.contractType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{contract.brand?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(contract.status)}>
                        {contract.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(contract.startDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {new Date(contract.endDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(contract.contractValue)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
