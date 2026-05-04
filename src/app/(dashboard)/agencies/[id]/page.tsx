export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
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
import { AgencyDocumentsCard } from "./documents-card";
import type { UploadedDoc } from "@/components/document-upload";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      influencers: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!agency) {
    notFound();
  }

  // Fetch active documents for this agency, grouped by documentType
  const activeDocs = await prisma.documentRecord.findMany({
    where: { entityType: "agency", entityId: id, status: "active" },
    select: { id: true, documentType: true, originalFilename: true, uploadedAt: true },
    orderBy: { uploadedAt: "desc" },
  });
  const initialDocs: Record<string, UploadedDoc | null> = {
    aadhar: null, pan: null, gst: null, udhyam: null, roster: null,
  };
  for (const d of activeDocs) {
    if (initialDocs[d.documentType] === null) {
      initialDocs[d.documentType] = {
        id: d.id,
        filename: d.originalFilename,
        uploadedAt: d.uploadedAt.toISOString(),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/agencies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{agency.name}</h1>
          {agency.contactPerson && (
            <p className="text-sm text-gray-500">{agency.contactPerson}</p>
          )}
        </div>
        <Badge
          className={
            agency.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }
        >
          {agency.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-gray-400" />
              Agency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {agency.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{agency.email}</span>
              </div>
            )}
            {agency.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{agency.phone}</span>
              </div>
            )}
            {agency.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <a
                  href={
                    agency.website.startsWith("http")
                      ? agency.website
                      : `https://${agency.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {agency.website}
                </a>
              </div>
            )}
            {agency.contactPerson && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{agency.contactPerson}</span>
              </div>
            )}
            {(agency.address || agency.city || agency.state) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span>
                  {[agency.address, agency.city, agency.state]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax &amp; Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">GST Number:</span>{" "}
              {agency.gstNumber || "-"}
            </div>
            <div>
              <span className="text-gray-500">PAN Number:</span>{" "}
              {agency.panNumber || "-"}
            </div>
            {agency.notes && (
              <div>
                <span className="text-gray-500">Notes:</span>
                <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                  {agency.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Influencers ({agency.influencers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {agency.influencers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No influencers managed by this agency yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agency.influencers.map((influencer) => (
                  <TableRow key={influencer.id}>
                    <TableCell>
                      <Link
                        href={`/influencers/${influencer.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {influencer.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {influencer.instagramHandle
                        ? `@${influencer.instagramHandle.replace(/^@/, "")}`
                        : "-"}
                    </TableCell>
                    <TableCell>{influencer.city || "-"}</TableCell>
                    <TableCell>
                      {influencer.categories?.length
                        ? influencer.categories.join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          influencer.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {influencer.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AgencyDocumentsCard agencyId={id} initialDocs={initialDocs} />
    </div>
  );
}
