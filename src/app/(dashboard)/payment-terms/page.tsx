export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Installment {
  percentage: number;
  trigger: string;
  label: string;
}

function formatInstallments(installments: unknown): string {
  if (!Array.isArray(installments)) return "-";
  return (installments as Installment[])
    .map((inst) => `${inst.percentage}% ${inst.label}`)
    .join(" + ");
}

export default async function PaymentTermsPage() {
  const paymentTerms = await prisma.paymentTerm.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Terms</h1>
        <Link href="/payment-terms/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            New Payment Term
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Installments</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentTerms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No payment terms found.
                </TableCell>
              </TableRow>
            ) : (
              paymentTerms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.name}</TableCell>
                  <TableCell className="text-gray-500">
                    {term.description || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatInstallments(term.installments)}
                  </TableCell>
                  <TableCell>
                    {term.isDefault && (
                      <Badge className="bg-blue-100 text-blue-700">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        term.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {term.isActive ? "Active" : "Inactive"}
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
