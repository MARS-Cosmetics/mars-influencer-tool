export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditableField } from "./editable-fields";
import { InlineStatusSelect } from "../inline-status-select";
import {
  ArrowLeft,
  Trash2,
  Package,
  Image,
  CreditCard,
  Truck,
  Star,
  ExternalLink,
  Calendar,
  User,
  Building2,
  FileText,
  Pencil,
} from "lucide-react";

function formatCurrency(amount: unknown, currency?: string | null): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "-";
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${num.toLocaleString("en-IN")}`;
}

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

const typeColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  barter: "bg-blue-100 text-blue-800",
};

const typeLabels: Record<string, string> = {
  paid: "Paid",
  barter: "Barter",
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

const assetStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  submitted: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  revision_requested: "bg-orange-100 text-orange-800",
  published: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const parcelStatusColors: Record<string, string> = {
  preparing: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  returned: "bg-red-100 text-red-800",
};

export default async function CollaborationDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ needsDueDate?: string }>;
}) {
  const { id } = await props.params;

  const collaboration = await prisma.collaboration.findUnique({
    where: { id },
    include: {
      influencer: true,
      brand: true,
      campaign: true,
      assignee: {
        select: { id: true, name: true, email: true },
      },
      creator: {
        select: { id: true, name: true },
      },
      products: {
        include: {
          product: true,
        },
      },
      assets: {
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: {
          approver: {
            select: { id: true, name: true },
          },
        },
      },
      prParcels: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!collaboration) {
    notFound();
  }

  // Fetch activity log
  const activityLogs = await prisma.activityLog.findMany({
    where: { entityType: "collaboration", entityId: id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
    take: 50,
  });

  // Check if due date warning is needed
  const searchParams = await props.searchParams;
  const needsDueDate = searchParams?.needsDueDate === "true";

  // deliverables are now shown as linked assets — no need to parse JSON

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/collaborations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {collaboration.influencer.name} × {collaboration.brand.name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[collaboration.type]}`}
              >
                {typeLabels[collaboration.type]}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[collaboration.status]}`}
              >
                {statusLabels[collaboration.status]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/collaborations/${collaboration.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <DeleteButton collaborationId={collaboration.id} />
        </div>
      </div>

      {/* Due date warning */}
      {needsDueDate && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Due date required</p>
            <p className="text-xs text-amber-700">Please set a due date in the Overview tab before advancing the status to Confirmed or beyond.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={needsDueDate ? "overview" : "overview"}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-1 h-3.5 w-3.5" />
            Products ({collaboration.products.length})
          </TabsTrigger>
          <TabsTrigger value="assets">
            <Image className="mr-1 h-3.5 w-3.5" />
            Assets ({collaboration.assets.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-1 h-3.5 w-3.5" />
            Payments ({collaboration.payments.length})
          </TabsTrigger>
          <TabsTrigger value="parcels">
            <Truck className="mr-1 h-3.5 w-3.5" />
            PR Parcels ({collaboration.prParcels.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity Log ({activityLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Collaboration Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Collaboration Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Type</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[collaboration.type]}`}
                  >
                    {typeLabels[collaboration.type]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <InlineStatusSelect
                    collaborationId={collaboration.id}
                    currentStatus={collaboration.status}
                  />
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Agreed Amount</span>
                  <EditableField
                    collaborationId={collaboration.id}
                    field="agreedAmount"
                    value={collaboration.agreedAmount as unknown as number}
                    type="number"
                    label="Agreed Amount"
                    displayFormat="currency"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Currency</span>
                  <span className="text-sm">{collaboration.currency || "INR"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Started</span>
                  <span className="text-sm">{formatDate(collaboration.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Due Date</span>
                  <EditableField
                    collaborationId={collaboration.id}
                    field="dueDate"
                    value={collaboration.dueDate ? new Date(collaboration.dueDate).toISOString().split("T")[0] : null}
                    type="date"
                    label="Due Date"
                    displayFormat="date"
                    placeholder="Not set"
                  />
                </div>
                {collaboration.contentRating && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Content Rating</span>
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {String(collaboration.contentRating)}
                      </span>
                    </div>
                    {collaboration.ratingNotes && (
                      <p className="text-sm text-gray-600">{collaboration.ratingNotes}</p>
                    )}
                  </>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="text-sm">{formatDateTime(collaboration.createdAt)}</span>
                </div>
                {collaboration.creator && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Created By</span>
                    <span className="text-sm">{collaboration.creator.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shopify Order & Tracking */}
            {(collaboration.shopifyOrderId || collaboration.shopifyTrackingId) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4" />
                    Shopify Order & Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {collaboration.shopifyOrderNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Order Number</span>
                      <span className="text-sm font-medium">{collaboration.shopifyOrderNumber}</span>
                    </div>
                  )}
                  {collaboration.shopifyOrderId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Order ID</span>
                      <span className="text-sm font-mono text-xs">{collaboration.shopifyOrderId}</span>
                    </div>
                  )}
                  {collaboration.shopifyOrderStatus && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Order Status</span>
                      <Badge className={collaboration.shopifyOrderStatus === "cancelled" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                        {collaboration.shopifyOrderStatus}
                      </Badge>
                    </div>
                  )}
                  {collaboration.shopifyFulfillmentStatus && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Fulfillment</span>
                      <Badge className={collaboration.shopifyFulfillmentStatus === "fulfilled" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                        {collaboration.shopifyFulfillmentStatus}
                      </Badge>
                    </div>
                  )}
                  <Separator />
                  {collaboration.shopifyTrackingId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Tracking ID</span>
                      <span className="text-sm font-mono">{collaboration.shopifyTrackingId}</span>
                    </div>
                  )}
                  {collaboration.shopifyTrackingUrl && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Tracking Link</span>
                      <a
                        href={collaboration.shopifyTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Track Shipment <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Influencer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Influencer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Name</span>
                  <Link
                    href={`/influencers/${collaboration.influencer.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {collaboration.influencer.name}
                  </Link>
                </div>
                {collaboration.influencer.instagramHandle && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Instagram</span>
                    <a
                      href={`https://instagram.com/${collaboration.influencer.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#A6192E] hover:underline"
                    >
                      @{collaboration.influencer.instagramHandle}
                    </a>
                  </div>
                )}
                {collaboration.influencer.email && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm">{collaboration.influencer.email}</span>
                  </div>
                )}
                {collaboration.influencer.phone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Phone</span>
                    <span className="text-sm">{collaboration.influencer.phone}</span>
                  </div>
                )}
                {collaboration.influencer.tier && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tier</span>
                    <span className="text-sm capitalize">{collaboration.influencer.tier}</span>
                  </div>
                )}
                {collaboration.influencer.igFollowerCount && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">IG Followers</span>
                    <span className="text-sm">
                      {collaboration.influencer.igFollowerCount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {collaboration.influencer.city && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">City</span>
                    <span className="text-sm">{collaboration.influencer.city}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Assigned To</span>
                  <span className="text-sm font-medium">{collaboration.assignee.name}</span>
                </div>
              </CardContent>
            </Card>

            {/* Brand & Campaign */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Brand & Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Brand</span>
                  <span className="text-sm font-medium">{collaboration.brand.name}</span>
                </div>
                {collaboration.campaign && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Campaign</span>
                    <span className="text-sm">{collaboration.campaign.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Brief */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Brief
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EditableField
                  collaborationId={collaboration.id}
                  field="brief"
                  value={collaboration.brief}
                  type="textarea"
                  label="Brief"
                  placeholder="Click to add brief..."
                />
              </CardContent>
            </Card>

            {/* Deliverables / Linked Assets Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Image className="h-4 w-4" />
                  Deliverables ({collaboration.assets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {collaboration.assets.length === 0 ? (
                  <p className="text-sm text-gray-400">No deliverables created yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collaboration.assets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium capitalize">
                            {asset.platform}
                          </span>
                          <span className="text-sm capitalize">{asset.contentType.replace(/_/g, " ")}</span>
                          {asset.hasAdRights && (
                            <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                              Ad Rights
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {asset.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due: {formatDate(asset.dueDate)}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${assetStatusColors[asset.status] || "bg-gray-100 text-gray-800"}`}
                          >
                            {asset.status.replace(/_/g, " ")}
                          </span>
                          <Link href={`/assets/${asset.id}`} className="text-xs text-blue-600 hover:underline">
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Products</CardTitle>
              <Button size="sm" variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>MRP</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collaboration.products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No products linked to this collaboration. Products are added when creating the collaboration.
                      </TableCell>
                    </TableRow>
                  ) : (
                    collaboration.products.map((cp) => (
                      <TableRow key={cp.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {cp.product.imageUrl && (
                              <img
                                src={cp.product.imageUrl}
                                alt={cp.product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{cp.product.name}</div>
                              {cp.product.category && (
                                <div className="text-xs text-muted-foreground">{cp.product.category}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{cp.product.sku || "-"}</TableCell>
                        <TableCell>{formatCurrency(cp.product.mrp as unknown as number)}</TableCell>
                        <TableCell>{cp.quantity}</TableCell>
                        <TableCell>{cp.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Assets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Content Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Reach</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collaboration.assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        No content assets yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    collaboration.assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="capitalize">{asset.platform}</TableCell>
                        <TableCell className="capitalize">
                          {asset.contentType.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${assetStatusColors[asset.status] || "bg-gray-100 text-gray-800"}`}
                          >
                            {asset.status.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>{asset.views?.toLocaleString("en-IN") ?? "-"}</TableCell>
                        <TableCell>{asset.likes?.toLocaleString("en-IN") ?? "-"}</TableCell>
                        <TableCell>{asset.comments?.toLocaleString("en-IN") ?? "-"}</TableCell>
                        <TableCell>{asset.reach?.toLocaleString("en-IN") ?? "-"}</TableCell>
                        <TableCell>
                          {asset.contentRating ? (
                            <span className="text-yellow-500 tracking-tight">
                              {Array.from({ length: 5 }, (_, i) =>
                                i < Number(asset.contentRating) ? "★" : ""
                              ).join("")}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(asset.publishedAt)}</TableCell>
                        <TableCell>
                          {asset.contentUrl ? (
                            <a
                              href={asset.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/assets/${asset.id}`}>
                            <Button variant="outline" size="sm">
                              <Star className="mr-1 h-3.5 w-3.5" />
                              Rate
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>TDS</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction Ref</TableHead>
                    <TableHead>Paid At</TableHead>
                    <TableHead>Approved By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collaboration.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No payments recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    collaboration.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount as unknown as number, payment.currency)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.netAmount as unknown as number, payment.currency)}
                        </TableCell>
                        <TableCell>
                          {payment.tdsAmount
                            ? `${formatCurrency(payment.tdsAmount as unknown as number)} (${payment.tdsPercentage}%)`
                            : "-"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.paymentMethod?.replace(/_/g, " ") || "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusColors[payment.status] || "bg-gray-100 text-gray-800"}`}
                          >
                            {payment.status}
                          </span>
                        </TableCell>
                        <TableCell>{payment.transactionRef || "-"}</TableCell>
                        <TableCell>{formatDateTime(payment.paidAt)}</TableCell>
                        <TableCell>{payment.approver?.name || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PR Parcels Tab */}
        <TabsContent value="parcels">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PR Parcels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {collaboration.prParcels.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No PR parcels for this collaboration.
                </p>
              ) : (
                collaboration.prParcels.map((parcel) => (
                  <Card key={parcel.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-sm">
                            {parcel.courierName || "Unknown Courier"}
                          </span>
                          {parcel.trackingNumber && (
                            <span className="text-xs text-gray-500">
                              #{parcel.trackingNumber}
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${parcelStatusColors[parcel.status] || "bg-gray-100 text-gray-800"}`}
                        >
                          {parcel.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {parcel.shippingAddress && (
                        <p className="text-xs text-gray-500 mb-2">
                          Ship to: {parcel.shippingAddress}
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        {parcel.shippedAt && (
                          <span>Shipped: {formatDate(parcel.shippedAt)}</span>
                        )}
                        {parcel.deliveredAt && (
                          <span>Delivered: {formatDate(parcel.deliveredAt)}</span>
                        )}
                      </div>
                      {parcel.items.length > 0 && (
                        <div className="mt-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parcel.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product.name}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log) => {
                    const actionIcons: Record<string, string> = {
                      status_change: "🔄",
                      field_update: "✏️",
                      product_added: "📦",
                      product_removed: "❌",
                      created: "🆕",
                      comment: "💬",
                    };
                    const icon = actionIcons[log.action] || "📝";

                    return (
                      <div key={log.id} className="flex gap-3 border-b pb-3 last:border-0">
                        <div className="mt-0.5 text-lg">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {log.description || log.action.replace(/_/g, " ")}
                            </span>
                            {log.field === "status" && log.oldValue && log.newValue && (
                              <span className="text-xs text-muted-foreground">
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{log.oldValue}</span>
                                {" → "}
                                <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-xs">{log.newValue}</span>
                              </span>
                            )}
                            {log.field && log.field !== "status" && log.oldValue && log.newValue && (
                              <span className="text-xs text-muted-foreground">
                                {log.oldValue} → {log.newValue}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {log.user && <span>by {log.user.name}</span>}
                            <span>{formatDateTime(log.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeleteButton({ collaborationId }: { collaborationId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { prisma } = await import("@/lib/db");
        await prisma.collaboration.update({
          where: { id: collaborationId },
          data: { status: "cancelled" },
        });
        const { redirect } = await import("next/navigation");
        redirect("/collaborations");
      }}
    >
      <Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700">
        <Trash2 className="mr-2 h-4 w-4" />
        Cancel
      </Button>
    </form>
  );
}
