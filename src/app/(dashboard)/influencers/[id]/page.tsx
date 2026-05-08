export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil } from "lucide-react";
import { InfluencerDetailTabs } from "./influencer-detail-tabs";
import { SpocCard } from "@/components/spoc-card";
import { auth } from "@/lib/auth";

function formatCount(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function formatCurrency(n: unknown): string {
  if (n == null) return "-";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const tierColors: Record<string, string> = {
  nano: "bg-gray-100 text-gray-700",
  micro: "bg-blue-100 text-blue-700",
  mid: "bg-green-100 text-green-700",
  macro: "bg-purple-100 text-purple-700",
  mega: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  discovered: "bg-gray-100 text-gray-700",
  contacted: "bg-yellow-100 text-yellow-700",
  form_submitted: "bg-orange-100 text-orange-700",
  demographics_verified: "bg-cyan-100 text-cyan-700",
  onboarded: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-200 text-gray-500",
  blacklisted: "bg-red-100 text-red-700",
  do_not_contact: "bg-red-200 text-red-800",
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium text-right">{value || "-"}</span>
    </div>
  );
}

export default async function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const influencer = await prisma.influencer.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
      agency: true,
      collaborations: {
        include: {
          brand: { select: { name: true } },
          campaign: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      prParcels: {
        include: {
          brand: { select: { name: true } },
          items: {
            include: { product: { select: { name: true, sku: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      assets: {
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: {
          collaboration: {
            select: {
              brand: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!influencer) {
    notFound();
  }

  // Overview Tab Content
  const overviewContent = (
    <div className="grid gap-6 md:grid-cols-2">
      {/* SPOC — points of contact */}
      <div className="md:col-span-2">
        <SpocCard
          hideInternal={!isAdmin}
          internal={{
            owner: influencer.owner,
            creator: influencer.creator,
            ownedAt: influencer.ownedAt,
          }}
          influencer={{
            name: influencer.name,
            email: influencer.email,
            phone: influencer.phone,
            whatsappNumber: influencer.whatsappNumber,
          }}
          agency={
            influencer.agency
              ? {
                  id: influencer.agency.id,
                  name: influencer.agency.name,
                  contactPerson: influencer.agency.contactPerson,
                  email: influencer.agency.email,
                  phone: influencer.agency.phone,
                  commissionPct: influencer.agency.commissionPct
                    ? Number(influencer.agency.commissionPct)
                    : null,
                  managedBy: influencer.managedBy,
                }
              : null
          }
        />
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Name" value={influencer.name} />
          <DetailRow label="Email" value={influencer.email} />
          <DetailRow label="Phone" value={influencer.phone} />
          <DetailRow label="WhatsApp" value={influencer.whatsappNumber} />
          <DetailRow
            label="Date of Birth"
            value={formatDate(influencer.dateOfBirth)}
          />
          <DetailRow
            label="Gender"
            value={influencer.gender?.replace(/_/g, " ")}
          />
          <DetailRow label="Bio" value={influencer.bio} />
          <DetailRow
            label="Location"
            value={
              [influencer.city, influencer.state, influencer.country]
                .filter(Boolean)
                .join(", ") || "-"
            }
          />
          <DetailRow
            label="Categories"
            value={influencer.categories.join(", ") || "-"}
          />
          <DetailRow
            label="Content Niches"
            value={influencer.contentNiches.join(", ") || "-"}
          />
          <DetailRow
            label="Languages"
            value={influencer.languages.join(", ") || "-"}
          />
          <DetailRow
            label="Primary Language"
            value={influencer.primaryLanguage}
          />
          <DetailRow label="Tags" value={influencer.tags.join(", ") || "-"} />
          <DetailRow label="Source" value={influencer.source?.replace(/_/g, " ")} />
          <DetailRow label="Referred By" value={influencer.referredBy} />
          <DetailRow label="Managed By" value={influencer.managedBy === "agency" ? "Agency" : "Self"} />
        </CardContent>
      </Card>

      {/* Social Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Social Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm text-gray-500">Instagram</span>
            {influencer.instagramHandle ? (
              <a
                href={`https://instagram.com/${influencer.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#A6192E] hover:underline"
              >
                @{influencer.instagramHandle}
              </a>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
          <DetailRow
            label="Followers"
            value={formatCount(influencer.igFollowerCount)}
          />
          <DetailRow
            label="Following"
            value={formatCount(influencer.igFollowingCount)}
          />
          <DetailRow
            label="Posts"
            value={formatCount(influencer.igPostCount)}
          />
          <DetailRow
            label="Engagement Rate"
            value={
              influencer.igEngagementRate != null
                ? `${Number(influencer.igEngagementRate).toFixed(2)}%`
                : null
            }
          />
          <DetailRow
            label="Avg Likes"
            value={formatCount(influencer.igAvgLikes)}
          />
          <DetailRow
            label="Avg Comments"
            value={formatCount(influencer.igAvgComments)}
          />
          <DetailRow
            label="Avg Reel Views"
            value={formatCount(influencer.igAvgReelViews)}
          />
          <DetailRow
            label="Avg Story Views"
            value={formatCount(influencer.igAvgStoryViews)}
          />
          <DetailRow
            label="Median Reel Views"
            value={formatCount(influencer.igMedianReelViews)}
          />
          {influencer.igLast8ReelViews.length > 0 && (
            <div className="py-2 border-b border-gray-100">
              <span className="text-muted-foreground text-sm block mb-2">
                Last 8 Reel Views
              </span>
              <div className="flex items-end gap-1 h-12">
                {(() => {
                  const views = influencer.igLast8ReelViews;
                  const max = Math.max(...views);
                  return views.map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-400 rounded-t"
                      style={{
                        height: `${max > 0 ? (v / max) * 100 : 0}%`,
                        minHeight: "2px",
                      }}
                      title={formatCount(v)}
                    />
                  ));
                })()}
              </div>
              <div className="flex gap-1 mt-1">
                {influencer.igLast8ReelViews.map((v, i) => (
                  <span
                    key={i}
                    className="flex-1 text-center text-[10px] text-muted-foreground"
                  >
                    {formatCount(v)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <DetailRow
            label="Credibility Score"
            value={
              influencer.igCredibilityScore != null
                ? Number(influencer.igCredibilityScore).toFixed(1)
                : null
            }
          />
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm text-gray-500">YouTube</span>
            {influencer.youtubeHandle ? (
              <a
                href={`https://youtube.com/@${influencer.youtubeHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#A6192E] hover:underline"
              >
                {influencer.youtubeHandle}
              </a>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
          <DetailRow
            label="YT Subscribers"
            value={formatCount(influencer.ytSubscriberCount)}
          />
          <DetailRow
            label="YT Avg Views"
            value={formatCount(influencer.ytAvgViews)}
          />
        </CardContent>
      </Card>

      {/* Audience Demographics */}
      <Card>
        <CardHeader>
          <CardTitle>Audience Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Male %"
            value={
              influencer.igAudienceMalePct != null
                ? `${Number(influencer.igAudienceMalePct).toFixed(1)}%`
                : null
            }
          />
          <DetailRow
            label="Female %"
            value={
              influencer.igAudienceFemalePct != null
                ? `${Number(influencer.igAudienceFemalePct).toFixed(1)}%`
                : null
            }
          />
          <DetailRow
            label="Top Age Range"
            value={influencer.igAudienceTopAgeRange}
          />
          <DetailRow
            label="Social Score"
            value={
              influencer.socialScore != null
                ? Number(influencer.socialScore).toFixed(1)
                : null
            }
          />
          <DetailRow
            label="Brand Affinity"
            value={
              influencer.brandAffinityScore != null
                ? Number(influencer.brandAffinityScore).toFixed(1)
                : null
            }
          />
          <DetailRow
            label="Content Quality"
            value={
              influencer.contentQualityScore != null
                ? Number(influencer.contentQualityScore).toFixed(1)
                : null
            }
          />
          <DetailRow
            label="Reliability"
            value={
              influencer.reliabilityScore != null
                ? Number(influencer.reliabilityScore).toFixed(1)
                : null
            }
          />
          <DetailRow
            label="Past Collabs"
            value={influencer.pastCollabCount}
          />
          <DetailRow
            label="Verified"
            value={influencer.isVerified ? "Yes" : "No"}
          />
        </CardContent>
      </Card>

      {/* Financial & Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle>Financial & Rate Card</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="PAN" value={influencer.panNumber} />
          <DetailRow label="GSTIN" value={influencer.gstin} />
          <DetailRow label="Bank Name" value={influencer.bankName} />
          <DetailRow label="Account Name" value={influencer.bankAccountName} />
          <DetailRow label="IFSC" value={influencer.bankIfscCode} />
          <DetailRow label="UPI" value={influencer.upiId} />
          <DetailRow
            label="Payment Pref."
            value={influencer.paymentPreference?.replace(/_/g, " ")}
          />
          <div className="border-t border-gray-200 mt-2 pt-2">
            <span className="text-sm font-medium">Rate Card</span>
          </div>
          <DetailRow
            label="IG Reel"
            value={formatCurrency(influencer.rateInstagramReel)}
          />
          <DetailRow
            label="IG Story"
            value={formatCurrency(influencer.rateInstagramStory)}
          />
          <DetailRow
            label="IG Post"
            value={formatCurrency(influencer.rateInstagramPost)}
          />
          <DetailRow
            label="YT Video"
            value={formatCurrency(influencer.rateYoutubeVideo)}
          />
          <DetailRow
            label="YT Short"
            value={formatCurrency(influencer.rateYoutubeShort)}
          />
          <DetailRow
            label="Blog Post"
            value={formatCurrency(influencer.rateBlogPost)}
          />
          <DetailRow
            label="Twitter Post"
            value={formatCurrency(influencer.rateTwitterPost)}
          />
          <DetailRow label="Currency" value={influencer.rateCurrency} />
          <DetailRow label="Rate Notes" value={influencer.rateNotes} />
        </CardContent>
      </Card>
    </div>
  );

  // Collaborations Tab
  const collaborationsContent = (
    <Card>
      <CardContent className="pt-4">
        {influencer.collaborations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No collaborations yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {influencer.collaborations.map((collab) => (
                <TableRow key={collab.id}>
                  <TableCell className="font-medium">
                    {collab.brand.name}
                  </TableCell>
                  <TableCell>{collab.campaign?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {collab.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {collab.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(collab.agreedAmount)}
                  </TableCell>
                  <TableCell>{formatDate(collab.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // PR Parcels Tab
  const prParcelsContent = (
    <Card>
      <CardContent className="pt-4">
        {influencer.prParcels.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No PR parcels yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Shipped</TableHead>
                <TableHead>Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {influencer.prParcels.map((parcel) => (
                <TableRow key={parcel.id}>
                  <TableCell className="font-medium">
                    {parcel.brand.name}
                  </TableCell>
                  <TableCell>
                    {parcel.items
                      .map((item) => `${item.product.name} x${item.quantity}`)
                      .join(", ") || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {parcel.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {parcel.trackingNumber || "-"}
                  </TableCell>
                  <TableCell>{formatDate(parcel.shippedAt)}</TableCell>
                  <TableCell>{formatDate(parcel.deliveredAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // Assets Tab
  const assetsContent = (
    <Card>
      <CardContent className="pt-4">
        {influencer.assets.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No assets yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead>Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {influencer.assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.platform}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {asset.contentType.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {asset.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCount(asset.views)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCount(asset.likes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCount(asset.comments)}
                  </TableCell>
                  <TableCell>{formatDate(asset.publishedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // Payments Tab
  const paymentsContent = (
    <Card>
      <CardContent className="pt-4">
        {influencer.payments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No payments yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {influencer.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.collaboration.brand.name}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payment.netAmount)}
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod?.replace(/_/g, " ") || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(payment.paidAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/influencers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {influencer.name}
              </h1>
              {influencer.tier && (
                <Badge
                  className={tierColors[influencer.tier] || ""}
                  variant="secondary"
                >
                  {influencer.tier}
                </Badge>
              )}
              <Badge
                className={statusColors[influencer.status] || ""}
                variant="secondary"
              >
                {influencer.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {influencer.instagramHandle
                ? `@${influencer.instagramHandle}`
                : ""}
              {influencer.instagramHandle && influencer.city ? " · " : ""}
              {influencer.city || ""}
            </p>
          </div>
        </div>
        <Link href={`/influencers/${influencer.id}/edit`}>
          <Button variant="outline">
            <Pencil className="size-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <InfluencerDetailTabs
        overviewContent={overviewContent}
        collaborationsContent={collaborationsContent}
        prParcelsContent={prParcelsContent}
        assetsContent={assetsContent}
        paymentsContent={paymentsContent}
      />
    </div>
  );
}
