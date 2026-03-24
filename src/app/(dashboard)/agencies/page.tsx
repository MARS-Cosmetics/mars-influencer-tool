export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
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

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  const where: Record<string, unknown> = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const agencies = await prisma.agency.findMany({
    where,
    include: {
      _count: {
        select: { influencers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agencies</h1>
        <Link href="/agencies/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            New Agency
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <form className="flex items-center gap-4 flex-1">
          <Input
            name="search"
            placeholder="Search agencies..."
            defaultValue={search || ""}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Influencers</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No agencies found.
                </TableCell>
              </TableRow>
            ) : (
              agencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell>
                    <Link
                      href={`/agencies/${agency.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {agency.name}
                    </Link>
                  </TableCell>
                  <TableCell>{agency.contactPerson || "-"}</TableCell>
                  <TableCell>{agency.email || "-"}</TableCell>
                  <TableCell>{agency.phone || "-"}</TableCell>
                  <TableCell>{agency.city || "-"}</TableCell>
                  <TableCell>{agency._count.influencers}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        agency.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {agency.isActive ? "Active" : "Inactive"}
                    </Badge>
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
