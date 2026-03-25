"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Truck,
  BarChart3,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SyncStatusData {
  connected: boolean;
  mockMode: boolean;
  products?: {
    lastSynced: string | null;
    count: number;
  };
  orders?: {
    lastSynced: string | null;
    count: number;
  };
  inventory?: {
    lastSynced: string | null;
  };
  config?: {
    storeUrl: string | null;
    hasAccessToken: boolean;
    apiVersion: string;
  };
  history?: SyncHistoryEntry[];
}

interface SyncHistoryEntry {
  id: string;
  type: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  duration: string | null;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  triggeredBy: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString("en-IN");
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    failed: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}
    >
      {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
      {status === "failed" && <XCircle className="h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ShopifySyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/shopify/sync-status");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch {
      // silent fail on status fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleSync(type: "products" | "orders" | "inventory") {
    const endpoints: Record<string, string> = {
      products: "/api/shopify/sync-products",
      orders: "/api/shopify/sync-orders",
      inventory: "/api/shopify/sync-inventory",
    };

    setSyncing((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(endpoints[type], { method: "POST" });
      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        toast.error(`Sync failed: authentication error. Please refresh and try again.`);
        return;
      }

      const data = await res.json();

      if (res.ok && data.success !== false) {
        toast.success(
          data.message ||
            `${type.charAt(0).toUpperCase() + type.slice(1)} sync completed successfully! ${data.itemsCreated ?? 0} created, ${data.itemsUpdated ?? 0} updated.`
        );
      } else {
        toast.error(data.error || `Failed to sync ${type}`);
      }

      await fetchStatus();
    } catch (err) {
      console.error(`Sync ${type} error:`, err);
      toast.error(`Failed to sync ${type}. Check console for details.`);
    } finally {
      setSyncing((prev) => ({ ...prev, [type]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = syncStatus?.connected && !syncStatus?.mockMode;
  const history = syncStatus?.history?.slice(0, 10) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Shopify Integration</h1>
            {syncStatus && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  isConnected
                    ? "border-green-200 bg-green-100 text-green-700"
                    : "border-yellow-200 bg-yellow-100 text-yellow-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500"}`}
                />
                {isConnected ? "Connected" : "Mock Mode (No Credentials)"}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage product, order, and inventory synchronization between Shopify
            and the MARS Influencer Tool.
          </p>
        </div>
      </div>

      {/* Sync Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Product Sync Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A6192E]/10">
                <Package className="h-5 w-5 text-[#A6192E]" />
              </div>
              <div className="flex-1">
                <CardTitle>Product & Inventory Sync</CardTitle>
              </div>
            </div>
            <CardDescription>
              Syncs products, variants, images, and inventory levels from Shopify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Weekly (automated)
            </span>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last synced:{" "}
                {formatDate(syncStatus?.products?.lastSynced ?? null)}
              </div>
              {syncStatus?.products?.count != null && (
                <p className="text-muted-foreground">
                  {syncStatus.products.count} products synced
                </p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => handleSync("products")}
              disabled={syncing.products}
            >
              {syncing.products ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Order Tracking Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A6192E]/10">
                <Truck className="h-5 w-5 text-[#A6192E]" />
              </div>
              <div className="flex-1">
                <CardTitle>Order & Tracking Sync</CardTitle>
              </div>
            </div>
            <CardDescription>
              Updates fulfillment status and tracking info for Shopify orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Daily (automated)
            </span>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last synced:{" "}
                {formatDate(syncStatus?.orders?.lastSynced ?? null)}
              </div>
              {syncStatus?.orders?.count != null && (
                <p className="text-muted-foreground">
                  {syncStatus.orders.count} orders tracked
                </p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => handleSync("orders")}
              disabled={syncing.orders}
            >
              {syncing.orders ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Inventory Levels Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A6192E]/10">
                <BarChart3 className="h-5 w-5 text-[#A6192E]" />
              </div>
              <div className="flex-1">
                <CardTitle>Inventory Levels</CardTitle>
              </div>
            </div>
            <CardDescription>
              Updates stock quantities for all products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Daily (with tracking)
            </span>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last synced:{" "}
                {formatDate(syncStatus?.inventory?.lastSynced ?? null)}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => handleSync("inventory")}
              disabled={syncing.inventory}
            >
              {syncing.inventory ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sync History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Triggered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium capitalize">
                      {entry.type}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell>{formatDate(entry.startedAt)}</TableCell>
                    <TableCell>{entry.duration ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {entry.itemsProcessed}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.itemsCreated}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.itemsUpdated}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.itemsFailed > 0 ? (
                        <span className="text-red-600">{entry.itemsFailed}</span>
                      ) : (
                        entry.itemsFailed
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {entry.triggeredBy}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Environment variables required for Shopify integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium font-mono">
                  SHOPIFY_STORE_URL
                </p>
                <p className="text-xs text-muted-foreground">
                  Your Shopify store URL (e.g., your-store.myshopify.com)
                </p>
              </div>
              {syncStatus?.config?.storeUrl ? (
                <Badge variant="secondary" className="font-mono text-xs">
                  {syncStatus.config.storeUrl.replace(/https?:\/\//, "").slice(0, 20)}...
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-700">
                  Not set
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium font-mono">
                  SHOPIFY_ACCESS_TOKEN
                </p>
                <p className="text-xs text-muted-foreground">
                  Admin API access token for authentication
                </p>
              </div>
              {syncStatus?.config?.hasAccessToken ? (
                <Badge variant="secondary" className="text-green-700">
                  Set
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-700">
                  Not set
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium font-mono">
                  SHOPIFY_API_VERSION
                </p>
                <p className="text-xs text-muted-foreground">
                  Shopify API version (default: 2024-10)
                </p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {syncStatus?.config?.apiVersion ?? "2024-10"}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Add these to your <code className="rounded bg-muted px-1 py-0.5">.env</code>{" "}
            file to connect to a real Shopify store. Without credentials, the
            system runs in mock mode with sample data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
