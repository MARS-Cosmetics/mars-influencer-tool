import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { createOrder, type ShopifyOrderInput } from "@/lib/shopify";

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

    // Enforce due date for confirmed and beyond
    const confirmedStatuses = ["confirmed", "in_progress", "content_submitted", "content_approved", "completed"];
    if (body.status && confirmedStatuses.includes(body.status)) {
      const currentDueDate = body.dueDate || previousCollab?.dueDate;
      if (!currentDueDate) {
        return NextResponse.json(
          { error: "Due date is required before moving to this status", requiresDueDate: true },
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

    // Auto-create Shopify order when status changes to "confirmed" and no order exists
    if (
      body.status === "confirmed" &&
      previousCollab &&
      previousCollab.status !== "confirmed" &&
      !previousCollab.shopifyOrderId
    ) {
      try {
        // Fetch full collaboration data for order creation
        const fullCollab = await prisma.collaboration.findUnique({
          where: { id },
          include: {
            influencer: true,
            products: { include: { product: true } },
          },
        });

        if (fullCollab && fullCollab.products.length > 0 && fullCollab.influencer.addressLine1) {
          const inf = fullCollab.influencer;
          const orderInput: ShopifyOrderInput = {
            line_items: fullCollab.products
              .filter((cp) => cp.product.shopifyVariantId)
              .map((cp) => ({
                variant_id: parseInt(cp.product.shopifyVariantId!),
                quantity: cp.quantity,
                price: "1.00",
                title: cp.product.name,
              })),
            tags: `influencer,${fullCollab.type},collab-${id}`,
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

          // Only create order if there are valid line items
          if (orderInput.line_items.length > 0) {
            const order = await createOrder(orderInput);
            await prisma.collaboration.update({
              where: { id },
              data: {
                shopifyOrderId: String(order.id),
                shopifyOrderNumber: order.name,
                shopifyOrderStatus: order.fulfillment_status || "unfulfilled",
              },
            });
          }
        }
      } catch (shopifyError) {
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
