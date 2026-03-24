export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { PaymentStatus } from "@/generated/prisma";
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
import { Plus, Search } from "lucide-react";

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
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.influencer = {
      name: { contains: search, mode: "insensitive" },
    };
  }

  if (statusFilter) {
    where.status = statusFilter;
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      influencer: { select: { id: true, name: true } },
      collaboration: {
        select: {
          id: true,
          type: true,
          brand: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const statuses = Object.values(PaymentStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Link href="/payments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Payment
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            name="search"
            placeholder="Search by influencer name..."
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
              <TableHead>Influencer</TableHead>
              <TableHead>Collaboration</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">TDS %</TableHead>
              <TableHead className="text-right">Net Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No payments found.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.influencer.name}
                  </TableCell>
                  <TableCell>
                    {payment.collaboration.type}
                    {payment.collaboration.brand && (
                      <span className="text-gray-500 ml-1">
                        ({payment.collaboration.brand.name})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatINR(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.tdsPercentage != null
                      ? `${payment.tdsPercentage}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatINR(payment.netAmount)}
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod
                      ? payment.paymentMethod.replace(/_/g, " ")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(payment.status)}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.paidAt
                      ? new Date(payment.paidAt).toLocaleDateString("en-IN")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
