import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { createOrder, type ShopifyOrderInput } from "@/lib/shopify";
import { withRetry } from "@/lib/shopify-retry";
import { validateTransition, type CollaborationContext } from "@/lib/state-machine";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
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
        contracts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collaboration) {
      return NextResponse.json(
        { error: "Collaboration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(collaboration);
  } catch (error) {
    console.error("Failed to fetch collaboration:", error);
    return NextResponse.json(
      { error: "Failed to fetch collaboration" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    // Convert date strings to Date objects
    const dateFields = ["dueDate"];
    for (const field of dateFields) {
      if (body[field]) {
        body[field] = new Date(body[field]);
      } else if (body[field] === "") {
        body[field] = null;
      }
    }

    // Convert agreedAmount to number
    if (body.agreedAmount !== undefined && body.agreedAmount !== "") {
      body.agreedAmount = parseFloat(body.agreedAmount);
    } else if (body.agreedAmount === "") {
      body.agreedAmount = null;
    }

    // Convert contentRating to number
    if (body.contentRating !== undefined && body.contentRating !== "") {
      body.contentRating = parseFloat(body.contentRating);
    } else if (body.contentRating === "") {
      body.contentRating = null;
    }

    // Parse deliverables if string
    if (typeof body.deliverables === "string" && body.deliverables.trim()) {
      try {
        body.deliverables = JSON.parse(body.deliverables);
      } catch {
        // Keep as-is
      }
    }

    // Fetch current state before updating
    const previousCollab = await prisma.collaboration.findUnique({
      where: { id },
      select: { status: true, shopifyOrderId: true, dueDate: true },
    });

    // Enforce state-machine transition rules if status is changing
    if (body.status && previousCollab && body.status !== previousCollab.status) {
      const fullCollab = await prisma.collaboration.findUnique({
        where: { id },
        select: {
          influencerId: true,
          type: true,
          requiresContentApproval: true,
          shopifyOrderId: true,
          dueDate: true,
          influencer: { select: { addressLine1: true, phone: true } },
          _count: { select: { products: true, assets: true } },
          assets: {
            select: { status: true, contentUrl: true, contentRating: true },
          },
        },
      });

      if (!fullCollab) {
        return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
      }

      const effectiveDueDate = body.dueDate ?? fullCollab.dueDate;

      const context: CollaborationContext = {
        influencerId: fullCollab.influencerId,
        hasProducts: fullCollab._count.products > 0,
        hasAddress: !!fullCollab.influencer.addressLine1,
        hasPhone: !!fullCollab.influencer.phone,
        hasDueDate: !!effectiveDueDate,
        hasShopifyOrder: !!fullCollab.shopifyOrderId,
        assetCount: fullCollab._count.assets,
        assetsCompleted: fullCollab.assets.filter((a) => a.status === "published").length,
        assetsWithUrl: fullCollab.assets.filter((a) => !!a.contentUrl).length,
        assetsWithRating: fullCollab.assets.filter((a) => a.contentRating !== null).length,
        requiresContentApproval: fullCollab.requiresContentApproval,
        type: fullCollab.type,
      };

      const result = validateTransition(previousCollab.status, body.status, context);
      if (!result.valid) {
        return NextResponse.json(
          {
            error: "Invalid status transition",
            details: result.errors,
            warnings: result.warnings,
          },
          { status: 400 }
        );
      }
    }

    const collaboration = await prisma.collaboration.update({
      where: { id },
      data: body,
      include: {
        influencer: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });

    // Log status change in activity log
    if (body.status && previousCollab && body.status !== previousCollab.status) {
      await prisma.activityLog.create({
        data: {
          entityType: "collaboration",
          entityId: id,
          action: "status_change",
          field: "status",
          oldValue: previousCollab.status,
          newValue: body.status,
          description: `Status changed from ${previousCollab.status} to ${body.status}`,
        },
      });
    }

    // Log other field changes
    if (previousCollab) {
      const trackFields = ["agreedAmount", "dueDate", "brief", "type"];
      for (const field of trackFields) {
        if (body[field] !== undefined && String(body[field]) !== String((previousCollab as Record<string, unknown>)[field])) {
          await prisma.activityLog.create({
            data: {
              entityType: "collaboration",
              entityId: id,
              action: "field_update",
              field,
              oldValue: String((previousCollab as Record<string, unknown>)[field] ?? ""),
              newValue: String(body[field] ?? ""),
              description: `${field} updated`,
            },
          });
        }
      }
    }

    // Auto-create Shopify order when status reaches "confirmed" or beyond and no order exists
    // Uses database-level atomic check to prevent race conditions / duplicate orders
    const confirmedOrBeyond = ["confirmed", "in_progress", "content_submitted", "content_approved", "completed"];
    const preConfirmed = ["draft", "outreach", "negotiation"];
    if (
      body.status &&
      confirmedOrBeyond.includes(body.status) &&
      previousCollab &&
      preConfirmed.includes(previousCollab.status) &&
      !previousCollab.shopifyOrderId
    ) {
      console.log(`[Shopify] Triggering order creation for collab ${id} (${previousCollab.status} → ${body.status})`);
      try {
        // Atomic lock: only proceed if shopifyOrderId is still null
        // This prevents duplicate orders from concurrent requests
        const lockResult = await prisma.collaboration.updateMany({
          where: {
            id,
            shopifyOrderId: null, // Only matches if no order has been created yet
          },
          data: {
            shopifyOrderId: `pending-${Date.now()}`, // Temporary placeholder to claim the lock
          },
        });

        // If no rows were updated, another request already claimed this
        if (lockResult.count === 0) {
          console.log(`Shopify order already being created for collab ${id}, skipping`);
          return NextResponse.json(collaboration);
        }

        // Fetch full collaboration data for order creation
        const fullCollab = await prisma.collaboration.findUnique({
          where: { id },
          include: {
            influencer: true,
            products: { include: { product: true } },
          },
        });

        const shopifyWarnings: string[] = [];

        if (!fullCollab) {
          shopifyWarnings.push("Collaboration not found");
        } else if (fullCollab.products.length === 0) {
          shopifyWarnings.push("No products linked to this collaboration");
        } else if (!fullCollab.influencer.addressLine1) {
          shopifyWarnings.push("Influencer address is missing");
        } else if (!fullCollab.influencer.phone) {
          shopifyWarnings.push("Influencer phone number is required for shipping");
        } else {
          const inf = fullCollab.influencer;

          // Try with shopifyVariantId first, fallback to shopifyProductId for line items
          const lineItems = fullCollab.products
            .filter((cp) => cp.product.shopifyVariantId || cp.product.shopifyProductId)
            .map((cp) => ({
              variant_id: cp.product.shopifyVariantId ? parseInt(cp.product.shopifyVariantId) : 0,
              product_id: !cp.product.shopifyVariantId && cp.product.shopifyProductId ? parseInt(cp.product.shopifyProductId) : 0,
              quantity: cp.quantity,
              price: "1.00",
              title: cp.product.name,
            }));

          if (lineItems.length === 0) {
            shopifyWarnings.push("No products have Shopify IDs. Please sync products from Shopify first, then link synced products to this collaboration.");
          } else {
            const orderInput: ShopifyOrderInput = {
              line_items: lineItems,
              tags: `influencer, ${fullCollab.type}, collab-${id.slice(0, 8)}`,
              note: `Influencer: ${inf.name}${inf.instagramHandle ? ` (@${inf.instagramHandle})` : ""} | Collaboration: ${id}`,
              shipping_address: {
                first_name: inf.name.split(" ")[0] || inf.name,
                last_name: inf.name.split(" ").slice(1).join(" ") || "",
                address1: inf.addressLine1!,
                address2: inf.addressLine2 || undefined,
                city: inf.city || "",
                province: inf.state || "",
                zip: inf.pincode || "",
                country: inf.country || "India",
                phone: inf.phone || undefined,
              },
              financial_status: "paid",
              send_receipt: false,
              send_fulfillment_receipt: false,
            };

            const orderResult = await withRetry(() => createOrder(orderInput), {
              maxRetries: 3,
              baseDelayMs: 1000,
            });

            if (orderResult.success && orderResult.result) {
              const order = orderResult.result;
              await prisma.collaboration.update({
                where: { id },
                data: {
                  shopifyOrderId: String(order.id),
                  shopifyOrderNumber: order.name,
                  shopifyOrderStatus: order.fulfillment_status || "unfulfilled",
                },
              });
              console.log(`[Shopify] Order created after ${orderResult.attempts} attempt(s)`);
            } else {
              // All retries failed — mark for background retry
              await prisma.collaboration.update({
                where: { id },
                data: { shopifyOrderStatus: 'pending_retry', shopifyOrderId: null },
              });
              console.warn(`[Shopify] Order creation failed after ${orderResult.attempts} attempts. Marked for retry. Error: ${orderResult.error}`);
              shopifyWarnings.push(`Shopify order will be retried (failed after ${orderResult.attempts} attempts: ${orderResult.error})`);
            }
          }
        }

        // If order wasn't created, release the lock
        if (shopifyWarnings.length > 0) {
          await prisma.collaboration.update({
            where: { id },
            data: { shopifyOrderId: null }, // Release lock
          });
          console.warn(`Shopify order not created for collab ${id}:`, shopifyWarnings);
          return NextResponse.json({
            ...collaboration,
            shopifyWarnings
          });
        }
      } catch (shopifyError) {
        // Release lock on failure so it can be retried
        await prisma.collaboration.update({
          where: { id },
          data: { shopifyOrderId: null },
        }).catch(() => {}); // Don't fail if cleanup fails
        console.error("Shopify order creation failed (non-blocking):", shopifyError);
        // Don't fail the collaboration update if Shopify fails
      }
    }

    return NextResponse.json(collaboration);
  } catch (error) {
    console.error("Failed to update collaboration:", error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : "Failed to update collaboration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const collaboration = await prisma.collaboration.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json(collaboration);
  } catch (error) {
    console.error("Failed to cancel collaboration:", error);
    return NextResponse.json(
      { error: "Failed to cancel collaboration" },
      { status: 500 }
    );
  }
}
